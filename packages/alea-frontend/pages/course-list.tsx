import { getAllCourses } from '@alea/spec';
import { CourseInfo, PRIMARY_COL } from '@alea/utils';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Typography } from '@mui/material';
import { NextPage } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { CourseThumb } from './u/[institution]';

const CourseList: NextPage = () => {
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo }>({});
  useEffect(() => {
    const fetchData = async () => {
      const courseInfoData = await getAllCourses();
      setCourses(courseInfoData);
    };
    fetchData();
  }, []);
  const groupedCourses: { [universityId: string]: CourseInfo[] } = {};
  Object.values(courses).forEach((course) => {
    const universityId = course.universityId || 'Unknown';
    if (!groupedCourses[universityId]) {
      groupedCourses[universityId] = [];
    }
    groupedCourses[universityId].push(course);
  });

  const universities = [
    {
      type: 'university',
      title: 'Friedrich Alexander University Erlangen Nürnberg',
      place: 'Erlangen',
      country: 'Germany',
      url: 'https://fau.de',
      acronym: 'FAU',
      logo: 'https://mathhub.info/img?a=courses/FAU/meta-inf&rp=source/PIC/FAU_Logo_Bildmarke.png',
    },
    {
      type: 'university',
      title: 'Jacobs University Bremen (Now Constructor University)',
      place: 'Bremen',
      country: 'Germany',
      url: 'https://jacobs-university.de',
      acronym: 'Jacobs',
      logo: 'https://mathhub.info/img?a=courses/Jacobs/meta-inf&rp=source/PIC/jacobs-logo.svg',
    },
  ];

  return (
    <MainLayout title="Course-List | ALeA">
      <Box m="0 auto" maxWidth="800px">
        {Object.entries(groupedCourses).map(([universityId, institutionCourses]) => (
          <Box key={universityId}>
            <Typography variant="h3">{universityId}</Typography>
            {universities.map((uni) => {
              if (uni.acronym !== universityId) return null;
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
