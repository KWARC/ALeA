import { Box, Button, CircularProgress, Container, Typography } from '@mui/material';
import { addRemoveMember, canAccessResource, checkIfUserRegisteredOnJP } from '@alea/spec';
import { Action, CURRENT_TERM, isFauId, ResourceName } from '@alea/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { ForceFauLogin } from '../../components/ForceFAULogin';
import MainLayout from '../../layouts/MainLayout';
import { useCurrentUser } from '@alea/react-utils';
function getJobPortalStudentsAcl() {
  return `job-portal-students`;
}
const JobPortal: NextPage = () => {
  const router = useRouter();
  const [showAdminButton, setShowAdminButton] = useState(false);
  const [forceFauLogin, setForceFauLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, isUserLoading } = useCurrentUser();

  const userId = user?.userId;
  const isStudent = !!userId && isFauId(userId);
  const isRecruiter = !!userId && !isFauId(userId);

  useEffect(() => {
    if (isUserLoading || !user) return;
    canAccessResource(ResourceName.JOB_PORTAL, Action.MANAGE_JOB_TYPES, {
      instanceId: CURRENT_TERM,
    }).then(setShowAdminButton);
  }, [user, isUserLoading]);

  if (forceFauLogin) {
    return (
      <MainLayout title="Job-Portal | VoLL-KI">
        <ForceFauLogin content={'job portal'} />
      </MainLayout>
    );
  }
  return (
    <MainLayout title="Job-Portal | ALeA">
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Box
          sx={{
            textAlign: 'center',
            p: 5,
            borderRadius: 4,
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(14px)',
            boxShadow: '0 20px 50px rgba(74,105,225,0.25)',
            border: '1px solid rgba(74,105,225,0.25)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: 5,
              background: 'linear-gradient(90deg, #4A69E1, #6C8CFF)',
            },
          }}
        >
          <Typography variant="h4" fontWeight={700} sx={{ color: '#4A69E1', mb: 1 }}>
            Welcome to Job Portal
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Choose your role to continue
          </Typography>
          {isUserLoading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}
          {!isUserLoading && (
            <>
              {(!user || isStudent) && (
                <Button
                  fullWidth
                  size="large"
                  sx={{
                    mb: 2,
                    bgcolor: '#4A69E1',
                    color: 'white',
                    textTransform: 'none',
                    fontSize: '16px',
                    fontWeight: 600,
                    py: 1.4,
                    borderRadius: 2,
                    boxShadow: '0 6px 16px rgba(74,105,225,0.4)',
                    '&:hover': {
                      bgcolor: '#233ba4',
                      boxShadow: '0 10px 28px rgba(74,105,225,0.6)',
                    },
                  }}
                  onClick={async () => {
                    if (!user) {
                      if (window.location.pathname === '/login') return;
                      router.push('/login?target=' + encodeURIComponent(window.location.href));
                    } else {
                      const result = await checkIfUserRegisteredOnJP();
                      if (result?.exists) {
                        router.push('job-portal/student/dashboard');
                      } else {
                        try {
                          await addRemoveMember({
                            memberId: userId,
                            aclId: getJobPortalStudentsAcl(),
                            isAclMember: false,
                            toBeAdded: true,
                          });
                        } catch (err) {
                          console.error('Error adding user to students ACL', err);
                          alert('Something went wrong. Please try again.');
                          return;
                        } finally {
                          setLoading(false);
                        }
                        router.push('job-portal/register/student');
                      }
                    }
                  }}
                >
                  {loading ? 'Processing...' : 'Continue as Student'}
                </Button>
              )}

              {(!user || isRecruiter) && (
                <Button
                  fullWidth
                  size="large"
                  sx={{
                    mb: 2,
                    bgcolor: '#4A69E1',
                    color: 'white',
                    textTransform: 'none',
                    fontSize: '16px',
                    fontWeight: 600,
                    py: 1.4,
                    borderRadius: 2,
                    boxShadow: '0 6px 16px rgba(74,105,225,0.4)',
                    '&:hover': {
                      bgcolor: '#233ba4',
                      boxShadow: '0 10px 28px rgba(74,105,225,0.6)',
                    },
                  }}
                  onClick={async () => {
                    if (!user) {
                      if (window.location.pathname === '/login') return;
                      router.push('/login?target=' + encodeURIComponent(window.location.href));
                    } else {
                      const result = await checkIfUserRegisteredOnJP();
                      router.push(
                        result?.exists
                          ? 'job-portal/recruiter/dashboard'
                          : 'job-portal/register/recruiter'
                      );
                    }
                  }}
                >
                  Continue as Recruiter
                </Button>
              )}

              {showAdminButton && (
                <Button
                  fullWidth
                  size="large"
                  sx={{
                    mb: 2,
                    bgcolor: 'warning.main',
                    color: 'white',
                    textTransform: 'none',
                    fontSize: '16px',
                    fontWeight: 600,
                    py: 1.4,
                    borderRadius: 2,
                    boxShadow: '0 6px 16px rgba(237,108,2,0.35)',
                    '&:hover': {
                      bgcolor: 'warning.dark',
                      boxShadow: '0 10px 28px rgba(237,108,2,0.55)',
                    },
                  }}
                  onClick={() => {
                    if (!user) {
                      if (window.location.pathname === '/login') return;
                      router.push('/login?target=' + encodeURIComponent(window.location.href));
                    } else {
                      router.push('job-portal/admin-dashboard/');
                    }
                  }}
                >
                  Admin Panel
                </Button>
              )}

              {isRecruiter && (
                <Button
                  variant="text"
                  sx={{
                    mt: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                    color: '#4A69E1',
                  }}
                  onClick={() => setForceFauLogin(true)}
                >
                  Are you a student? Login with FAU ID
                </Button>
              )}
            </>
          )}
        </Box>
      </Container>
    </MainLayout>
  );
};

export default JobPortal;
