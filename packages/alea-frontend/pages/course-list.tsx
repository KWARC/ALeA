import { getAllCourses } from '@alea/spec';
import { CourseInfo } from '@alea/utils';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Typography, SxProps, Theme } from '@mui/material';
import { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getLocaleObject } from '../lang/utils';
import MainLayout from '../layouts/MainLayout';
import { CourseThumb } from './u/[institution]';

const CourseList: NextPage = () => {
  const { home: t } = getLocaleObject(useRouter());
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
    <MainLayout title={`${t.courseList.title} | ALeA`} bgColor="page.background">
      <Box sx={{ bgcolor: 'page.background', px: { xs: 2, sm: 3 }, py: { xs: 3, md: 4 } }}>
        <Box m="0 auto" maxWidth={860}>
          <Box mb={3}>
            <Typography
              component="h1"
              sx={{
                color: 'text.primary',
                fontSize: { xs: 32, md: 38 },
                fontWeight: 800,
                lineHeight: 1.15,
                mb: 1,
              }}
            >
              {t.courseList.title}
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 17 }}>
              {t.courseList.subtitle}
            </Typography>
          </Box>

          {Object.entries(groupedCourses).map(([universityId, institutionCourses]) => (
            <Box
              key={universityId}
              sx={{
                mb: { xs: 4, md: 5 },
              }}
            >
              <Box
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  mb: 1.5,
                  pb: 1.5,
                }}
              >
                <Typography component="h2" sx={courseListStyles.universityHeading}>
                  <Link href={`/u/${universityId}`}>
                    {universityId}
                  </Link>
                </Typography>
                {universities.map((uni) => {
                  if (uni.acronym !== universityId) return null;
                  return (
                    <Box key={uni.title}>
                      <Typography display="flex" alignItems="center" fontWeight={700}>
                        {uni.title}{' '}
                        <Link href={uni.url} target="_blank">
                          <OpenInNewIcon sx={{ color: 'primary.main', fontSize: 18, ml: 0.5 }} />
                        </Link>
                      </Typography>
                      <Typography sx={{ color: 'text.secondary' }}>
                        {uni.country + ', ' + uni.place}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: { xs: 'center', md: 'flex-start' },
                }}
              >
                {institutionCourses.map((c) => (
                  <CourseThumb key={c.courseId} course={c} />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </MainLayout>
  );
};
const courseListStyles: Record<'universityHeading', SxProps<Theme>> = {
  universityHeading: {
    color: 'text.primary',
    fontSize: 28,
    fontWeight: 800,
    mb: 0.25,
    '& a': {
      color: 'inherit',
      textDecoration: 'none',
      cursor: 'pointer',
      transition: 'color 0.2s ease',
    },
    '& a:hover': {
      color: 'primary.main',
      textDecoration: 'underline',
    },
  },
};

export default CourseList;
