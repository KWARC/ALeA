import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Typography } from '@mui/material';
import { DocIdxType, getCourseInfo, getDocIdx } from '@alea/spec';
import { FTML } from '@kwarc/ftml-viewer';
import { CourseInfo, PRIMARY_COL } from '@alea/utils';
import { NextPage } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { CourseThumb } from './u/[institution]';

const CourseList: NextPage = () => {
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo }>({});
  const [docIdx, setDocIdx] = useState<(FTML.ArchiveIndex | FTML.Institution)[]>([]);
  useEffect(() => {
    const fetchData = async () => {
      const docIdxData = await getDocIdx();
      console.log({ docIdxData });
      setDocIdx(docIdxData);

      const courseInfoData = await getCourseInfo();
      setCourses(courseInfoData);
    };
    fetchData();
  }, []);
  const groupedCourses: { [institution: string]: CourseInfo[] } = {};
  Object.values(courses).forEach((course) => {
    if (!groupedCourses[course.institution]) {
      groupedCourses[course.institution] = [];
    }
    groupedCourses[course.institution].push(course);
  });

  const universities = docIdx.filter((doc) => doc.type === DocIdxType.university) as FTML.Institution[];
  return (
    <MainLayout title="Course-List | ALeA">
      <Box m="0 auto" maxWidth="800px">
        {Object.entries(groupedCourses).map(([institution, institutionCourses]) => (
          <Box key={institution}>
            <Typography variant="h3">{institution}</Typography>
            {universities.map((uni) => {
              if (uni.acronym !== institution) return null;
              return (
                <Box key={uni.title}>
                  <Typography display="flex" alignItems="center" fontWeight="bold">
                    {uni.title}{' '}
                    <Link href={uni.url} target="_blank">
                      <OpenInNewIcon style={{ color: PRIMARY_COL }} />
                    </Link>
                  </Typography>
                  <Typography>{uni.country + ', ' + uni.place}</Typography>
                  {/* <Typography display="flex" alignItems="center">
                    View sources
                    <Link href={`https://gl.mathhub.info/${uni.archive}`} target="_blank">
                      <OpenInNewIcon style={{ color: PRIMARY_COL }} />
                    </Link>
                  </Typography> */}
                </Box>
              );
            })}
            <Box display="flex" flexWrap="wrap">
              {institutionCourses.map((c) => (
                <CourseThumb key={c.courseId} course={c} />
              ))}
            </Box>
            <hr style={{ width: '90%' }} />
          </Box>
        ))}
      </Box>
    </MainLayout>
  );
};

export default CourseList;
