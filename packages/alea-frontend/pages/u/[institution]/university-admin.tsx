import { useEffect, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import MainLayout from '../../../layouts/MainLayout';
import {
  getSemesterInfo,
  getInstances,
  SemesterData,
} from '@stex-react/spec';
import { DashboardHeader } from '../../../components/university-admin/DashboardHeader';
import { SemesterForm } from '../../../components/university-admin/SemesterForm';
import { CourseManagement } from '../../../components/university-admin/CourseManagement';
import { HolidayManagement } from '../../../components/university-admin/HolidayManagement';
import { SemesterDetail } from '../../../components/university-admin/SemesterDetail';
import { isUserMember } from '@stex-react/spec';

export default function UniversityAdminDashboard() {
  const router = useRouter();
  const { institution } = router.query;
  const universityId = institution as string;
  const [semester, setSemester] = useState('');
  const [showSemForm, setShowSemForm] = useState(false);
  const [semesters, setSemesters] = useState<SemesterData[]>([]);
  const [semesterOptions, setSemesterOptions] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!universityId) return;
    isUserMember(`${universityId?.toLocaleLowerCase()}-admin`).then((isUniversityAdmin) => {
      if (!isUniversityAdmin) {
        setIsAuthorized(false);
        router.push('/');
      } else {
        setIsAuthorized(true);
      }
    });
  }, [router, universityId]);

  const fetchSemesterOptions = async (): Promise<string[] | void> => {
    if (!universityId) return;

    setLoadingOptions(true);
    try {
      const options = await getInstances(universityId);
      setSemesterOptions(options);
      if (options.length > 0 && !semester) {
        setSemester(options[0]);
      }
      return options;
    } catch (error) {
      console.error('Error fetching semester options:', error);
      setSemesterOptions([]);
    } finally {
      setLoadingOptions(false);
    }
  };

  const fetchSemesterData = async (selectedSemester: string) => {
    if (!universityId) return;
    try {
      const data: any = await getSemesterInfo(universityId, selectedSemester);
      const semesterData = data.semesterInfo || data;
      const mapped = (semesterData as any[]).map((item: any) => ({
        semesterStart: item.semesterStart,
        semesterEnd: item.semesterEnd,
        lectureStartDate: item.lectureStartDate,
        lectureEndDate: item.lectureEndDate,
      }));
      setSemesters(mapped);
    } catch (error) {
      console.error('Error fetching semester info:', error);
      setSemesters([]);
    }
  };

  useEffect(() => {
    if (universityId) {
      fetchSemesterOptions();
    }
  }, [universityId]);

  useEffect(() => {
    if (semester && universityId) {
      fetchSemesterData(semester);
    }
  }, [semester, universityId]);

  const handleSemesterCreated = async (newSemesterId?: string) => {
    setShowSemForm(false);
    const options = (await fetchSemesterOptions()) || semesterOptions;
    const nextSemester = newSemesterId || semester || options?.[0];
    if (nextSemester && universityId) {
      setSemester(nextSemester);
      await fetchSemesterData(nextSemester);
    }
  };

  const handleSemesterChange = (newSemester: string) => {
    setSemester(newSemester);
  };

  const handleToggleSemForm = () => {
    setShowSemForm((prev) => !prev);
  };

  if (isAuthorized === null) {
    return (
      <MainLayout>
        <Box
          minHeight="100vh"
          sx={{
            background: 'linear-gradient(135deg, #f5f7fa 0%, #e3f0ff 100%)',
            py: 6,
            px: { xs: 1, sm: 4 },
          }}
        >
          <Box maxWidth={1100} mx="auto">
            <Paper elevation={4} sx={{ p: 4, borderRadius: 4, mb: 4 }}>
              <Box textAlign="center">
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  Checking Authorization...
                </Typography>
                <Typography variant="body1">
                  Please wait while we verify your access.
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Box>
      </MainLayout>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  if (router.isFallback || !universityId) {
    return (
      <MainLayout>
        <Box
          minHeight="100vh"
          sx={{
            background: 'linear-gradient(135deg, #f5f7fa 0%, #e3f0ff 100%)',
            py: 6,
            px: { xs: 1, sm: 4 },
          }}
        >
          <Box maxWidth={1100} mx="auto">
            <Paper elevation={4} sx={{ p: 4, borderRadius: 4, mb: 4 }}>
              <Box textAlign="center">
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  Loading University Admin Dashboard...
                </Typography>
                <Typography variant="body1">
                  Please wait while we load the dashboard for {institution || 'your institution'}.
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box
        minHeight="100vh"
        sx={{
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e3f0ff 100%)',
          py: 6,
          px: { xs: 1, sm: 4 },
        }}
      >
        <Box maxWidth={1100} mx="auto">
          <Paper elevation={4} sx={{ p: 4, borderRadius: 4, mb: 4 }}>
            <DashboardHeader
              semester={semester}
              semesterOptions={semesterOptions}
              loadingOptions={loadingOptions}
              onSemesterChange={handleSemesterChange}
              onToggleSemForm={handleToggleSemForm}
              showSemForm={showSemForm}
            />

            {semesterOptions.length === 0 && !loadingOptions && (
              <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3, background: '#fff3cd', border: '1px solid #ffeaa7' }}>
                <Box textAlign="center">
                  <Typography variant="h6" sx={{ color: '#856404', fontWeight: 600, mb: 1 }}>
                    No Semester Available
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#856404' }}>
                    No semester is available to create semester info. Please add a new semester to create semester info.
                  </Typography>
                </Box>
              </Paper>
            )}

            {showSemForm && (
              <SemesterForm
                onSemesterCreated={handleSemesterCreated}
                currentSemester={semester}
                universityId={universityId}
              />
            )}

            <CourseManagement semester={semester} universityId={universityId} disabled={semesterOptions.length === 0} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box flex={1}>
                <SemesterDetail
                  semesters={semesters}
                  universityId={universityId}
                  instanceId={semester}
                  onSemesterUpdated={handleSemesterCreated}
                  disabled={semesterOptions.length === 0}
                />
              </Box>
              <Box flex={1} mb={{ xs: 3, md: 0 }}>
                <HolidayManagement universityId={universityId} instanceId={semester} disabled={semesterOptions.length === 0} />
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    </MainLayout>
  );
}
