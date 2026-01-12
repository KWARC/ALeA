import { Box, CircularProgress } from '@mui/material';
import { getAllCourses, getLatestInstance, validateInstitution, validateInstance } from '@alea/spec';
import { FTML } from '@flexiformal/ftml';
import { CourseInfo } from '@alea/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ProblemList from '../../../../components/ProblemList';
import MainLayout from '../../../../layouts/MainLayout';
import { contentToc } from '@flexiformal/ftml-backend';

const CourseProblemsPage: NextPage = () => {
  const router = useRouter();
  
  const rawInstitutionId = router.query.institutionId as string;
  const courseId = router.query.courseId as string;
  const instanceIdOrLatest = router.query.instanceIdOrLatest as string;
  
  const institutionId = rawInstitutionId?.toUpperCase() || '';

  const [courses, setCourses] = useState<{ [id: string]: CourseInfo } | undefined>(undefined);
  const [sectionsData, setSectionsData] = useState<FTML.TocElem[] | undefined>(undefined);
  
  const [resolvedInstanceId, setResolvedInstanceId] = useState<string | null>(null);
  const [loadingInstanceId, setLoadingInstanceId] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    if (!router.isReady || !rawInstitutionId || !courseId || !instanceIdOrLatest) return;
    if (rawInstitutionId !== institutionId) {
      const queryString = router.asPath.includes('?') ? router.asPath.split('?')[1] : '';
      const normalizedPath = `/${institutionId}/${courseId}/${instanceIdOrLatest}/practice-problems${queryString ? `?${queryString}` : ''}`;
      router.replace(normalizedPath);
      return;
    }
  }, [router.isReady, rawInstitutionId, institutionId, courseId, instanceIdOrLatest, router]);

  useEffect(() => {
    if (!router.isReady || !institutionId || !courseId || !instanceIdOrLatest) return;
    
    setIsValidating(true);
    setValidationError(null);
    
    validateInstitution(institutionId)
      .then((isValid) => {
        if (!isValid) {
          setValidationError('Invalid institutionId');
          setIsValidating(false);
          setTimeout(() => router.push('/'), 3000);
          return;
        }
        
        getAllCourses().then((allCourses) => {
          setCourses(allCourses);
          if (!allCourses[courseId]) {
            setValidationError('Invalid courseId');
            setIsValidating(false);
            setTimeout(() => router.push('/'), 3000);
            return;
          }
          
          if (instanceIdOrLatest === 'latest') {
            setLoadingInstanceId(true);
            getLatestInstance(institutionId)
              .then((latestInstanceId) => {
                setResolvedInstanceId(latestInstanceId);
                setLoadingInstanceId(false);
                setIsValidating(false);
              })
              .catch((error) => {
                console.error('Failed to fetch latest instanceId:', error);
                setValidationError('Failed to fetch latest instanceId');
                setLoadingInstanceId(false);
                setIsValidating(false);
              });
          } else {
            validateInstance(institutionId, instanceIdOrLatest)
              .then((isValidInstance) => {
                if (!isValidInstance) {
                  setValidationError('Invalid instanceId');
                  setIsValidating(false);
                  setTimeout(() => router.push('/'), 3000);
                } else {
                  setResolvedInstanceId(instanceIdOrLatest);
                  setLoadingInstanceId(false);
                  setIsValidating(false);
                }
              })
              .catch((error) => {
                console.error('Error validating instanceId:', error);
                setValidationError('Invalid instanceId');
                setIsValidating(false);
                setTimeout(() => router.push('/'), 3000);
              });
          }
        });
      })
      .catch((error) => {
        console.error('Error validating institutionId:', error);
        setValidationError('Error validating institutionId');
        setIsValidating(false);
      });
  }, [router.isReady, institutionId, courseId, instanceIdOrLatest, router]);

  useEffect(() => {
    async function fetchSectionData() {
      if (!courses || !courseId) return;
      const courseInfo = courses?.[courseId];
      if (!courseInfo) {
        router.replace('/');
        return;
      }
      const { notes } = courseInfo;
      const tocContent = (await contentToc({ uri: notes }))?.[1] ?? [];
      setSectionsData(tocContent);
    }
    fetchSectionData();
  }, [courses, courseId, router]);

  if (validationError && !isValidating && !loadingInstanceId) {
    return (
      <MainLayout title="Error | ALeA">
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (!router.isReady || !courses || isValidating || loadingInstanceId || !resolvedInstanceId) {
    return <CircularProgress />;
  }
  
  if (!sectionsData) return <CircularProgress />;

  return (
    <MainLayout title={`${(courseId || '').toUpperCase()} Problems | ALeA`}>
      <ProblemList courseSections={sectionsData} courseId={courseId} />
    </MainLayout>
  );
};

export default CourseProblemsPage;
