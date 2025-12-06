import { Box, Button, Container, Typography } from '@mui/material';
import {
  canAccessResource,
  checkIfUserRegisteredOnJP,
  getUserInfo,
  isLoggedIn,
} from '@alea/spec';
import { Action, CURRENT_TERM, isFauId, ResourceName } from '@alea/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { ForceFauLogin } from '../../components/ForceFAULogin';
import MainLayout from '../../layouts/MainLayout';

const JobPortal: NextPage = () => {
  const router = useRouter();
  const [isLogIn, setIsLogIn] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [isRecruiter, setIsRecruiter] = useState(false);
  const [forceFauLogin, setForceFauLogin] = useState(false);
  const [userId, setUserId] = useState('');
  const [accessCheckLoading, setAccessCheckLoading] = useState(true);
  const showStudentButton = !isLogIn || isStudent;
  const showRecruiterButton = !isLogIn || isRecruiter;
  const [showAdminButton, setShowAdminButton] = useState(!isLogIn);
  const checkAccess = async () => {
    const hasAccess = await canAccessResource(ResourceName.JOB_PORTAL, Action.MANAGE_JOB_TYPES, {
      instanceId: CURRENT_TERM,
    });
    console.log({ hasAccess });

    if (hasAccess) {
      setShowAdminButton(true);
    } else {
      setShowAdminButton(false);
    }
  };
  useEffect(() => {
    const loggedIn = isLoggedIn();
    setIsLogIn(loggedIn);
    if (loggedIn) {
      checkAccess();
      getUserInfo().then((userInfo) => {
        const uid = userInfo?.userId;
        if (!uid) return;
        setUserId(uid);
        isFauId(uid) ? setIsStudent(true) : setIsRecruiter(true);
      });
    }
  }, []);
  useEffect(() => {
    // const checkAccess = async () => {
    //   const hasAccess = await canAccessResource(ResourceName.JOB_PORTAL, Action.CREATE_JOB_TYPE, {
    //     instanceId: CURRENT_TERM,
    //   });
    //   console.log({ hasAccess });
    //   if (hasAccess) {
    //     setShowAdminButton(true);
    //   } else {
    //     setShowAdminButton(false);
    //   }
    // };
    // checkAccess();
  }, []);

  //   useEffect(() => {
  //     const checkAccess = async () => {
  //       // setAccessCheckLoading(true);
  //       const hasAccess = await canAccessResource(ResourceName.JOB_PORTAL, Action.CREATE_JOB_TYPE, {
  //         instanceId: CURRENT_TERM,
  //       });
  //       console.log({hasAccess});
  //       if (hasAccess) {
  // setShowAdminButton(true);      // setAccessCheckLoading(false);
  //     };
  //     checkAccess();
  //   }}, []);
  console.log({ showAdminButton });

  if (forceFauLogin) {
    return (
      <MainLayout title="Job-Portal | VoLL-KI">
        <ForceFauLogin content={'job portal'} />
      </MainLayout>
    );
  }
  return (
    <MainLayout title="Job-Portal | VoLL-KI">
      <Container maxWidth="sm" sx={{ mt: 5 }}>
        <Box
          sx={{
            textAlign: 'center',
            border: '1px solid #ccc',
            borderRadius: 2,
            boxShadow: 3,
            p: 4,
          }}
        >
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            Welcome to Job Portal
          </Typography>
          {showStudentButton && (
            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mb: 2 }}
              onClick={async () => {
                if (!isLogIn) {
                  if (window.location.pathname === '/login') return;
                  router.push('/login?target=' + encodeURIComponent(window.location.href));
                } else {
                  const result = await checkIfUserRegisteredOnJP(userId);
                  if (result.exists) {
                    router.push('job-portal/student/dashboard');
                  } else {
                    router.push('job-portal/register/student');
                  }
                }
              }}
            >
              Student
            </Button>
          )}

          {showRecruiterButton && (
            <Button
              variant="contained"
              fullWidth
              sx={{ mb: 2 }}
              onClick={async () => {
                if (!isLogIn) {
                  if (window.location.pathname === '/login') return;
                  router.push('/login?target=' + encodeURIComponent(window.location.href));
                } else {
                  const result = await checkIfUserRegisteredOnJP(userId);
                  if (result.exists) {
                    router.push('job-portal/recruiter/dashboard');
                  } else {
                    router.push('job-portal/register/recruiter');
                  }
                }
              }}
            >
              Recruiter
            </Button>
          )}
          {showAdminButton && (
            <Button
              variant="contained"
              color="warning"
              fullWidth
              sx={{ mb: 2 }}
              onClick={() => {
                if (!isLogIn) {
                  if (window.location.pathname === '/login') return;
                  router.push('/login?target=' + encodeURIComponent(window.location.href));
                } else {
                  router.push('job-portal/admin-dashboard/');
                }
              }}
            >
              Admin
            </Button>
          )}
          {isRecruiter && (
            <Button variant="contained" color="secondary" onClick={() => setForceFauLogin(true)}>
              Are You a Student?
            </Button>
          )}
        </Box>
      </Container>
    </MainLayout>
  );
};

export default JobPortal;
