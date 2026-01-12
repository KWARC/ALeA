import CancelIcon from '@mui/icons-material/Cancel';
import HandshakeIcon from '@mui/icons-material/Handshake';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Typography,
} from '@mui/material';
import {
  connectionRequest,
  getAllCourses,
  GetStudyBuddiesResponse,
  getStudyBuddyList,
  getStudyBuddyUserInfo,
  isLoggedIn,
  Languages,
  MeetType,
  removeConnectionRequest,
  setActive,
  StudyBuddy,
  updateStudyBuddyInfo,
  getLatestInstance,
  validateInstitution,
  validateInstance,
} from '@alea/spec';
import { BG_COLOR, CourseInfo, MaAI_COURSES } from '@alea/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { StudyBuddyForm } from '../../../../components/StudyBuddyForm';
import { StudyBuddyListing, StudyBuddyListingTable } from '../../../../components/StudyBuddyListingTable';
import { getLocaleObject } from '../../../../lang/utils';
import MainLayout from '../../../../layouts/MainLayout';
import { CourseHeader } from '../../../course-home/[courseId]';

function OptOutButton({ studyBuddy, courseId, institutionId, instanceId }: { studyBuddy: StudyBuddy; courseId: string; institutionId: string; instanceId: string }) {
  const { studyBuddy: t } = getLocaleObject(useRouter());
  return (
    <Button
      variant="contained"
      onClick={async () => {
        const prompt = t.optOutPrompt.replace('$1', courseId);
        if (studyBuddy.active && !confirm(prompt)) return;
        await setActive(courseId, !studyBuddy.active, institutionId, instanceId);
        if (!studyBuddy.active) alert(t.haveEnrolled.replace('$1', courseId));
        location.reload();
      }}
    >
      {studyBuddy.active ? t.optOut : t.reJoin}
    </Button>
  );
}

const StudyBuddyPage: NextPage = () => {
  const router = useRouter();
  
  const rawInstitutionId = router.query.institutionId as string;
  const courseId = router.query.courseId as string;
  const instanceIdOrLatest = router.query.instanceIdOrLatest as string;
  
  // Normalize institutionId to uppercase
  const institutionId = rawInstitutionId?.toUpperCase() || '';
  
  const { studyBuddy: t } = getLocaleObject(router);
  const [isLoading, setIsLoading] = useState(true);
  const [fromServer, setFromServer] = useState<StudyBuddy | undefined>(undefined);
  const [allBuddies, setAllBuddies] = useState<GetStudyBuddiesResponse | undefined>(undefined);
  const [userInput, setUserInput] = useState<StudyBuddy>({
    userId: '',
    userName: '',
    intro: '',
    courseId: '',
    studyProgram: '',
    semester: 1,
    email: '',
    meetType: MeetType.Both,
    dayPreference: '',
    languages: Languages.Deutsch,
    active: false,
  });
  const [agreed, setAgreed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo } | undefined>(undefined);
  const masterCourses = MaAI_COURSES;
  
  const [resolvedInstanceId, setResolvedInstanceId] = useState<string | null>(null);
  const [loadingInstanceId, setLoadingInstanceId] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  // Redirect if case mismatch
  useEffect(() => {
    if (!router.isReady || !rawInstitutionId || !courseId || !instanceIdOrLatest) return;
    if (rawInstitutionId !== institutionId) {
      const queryString = router.asPath.includes('?') ? router.asPath.split('?')[1] : '';
      const normalizedPath = `/${institutionId}/${courseId}/${instanceIdOrLatest}/study-buddy${queryString ? `?${queryString}` : ''}`;
      router.replace(normalizedPath);
      return;
    }
  }, [router.isReady, rawInstitutionId, institutionId, courseId, instanceIdOrLatest, router]);

  // Validate and resolve instanceId
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

  const refetchStudyBuddyLists = useCallback(() => {
    if (!courseId || !fromServer?.active || !resolvedInstanceId) return;
    if (courseId) getStudyBuddyList(courseId, institutionId, resolvedInstanceId).then(setAllBuddies);
  }, [courseId, fromServer?.active, institutionId, resolvedInstanceId]);

  useEffect(() => {
    refetchStudyBuddyLists();
  }, [courseId, refetchStudyBuddyLists]);

  useEffect(() => {
    if (!courseId || !isLoggedIn() || !resolvedInstanceId) return;
    setIsLoading(true);
    getStudyBuddyUserInfo(courseId, institutionId, resolvedInstanceId).then((data) => {
      setIsLoading(false);
      setFromServer(data);
    });
  }, [courseId, institutionId, resolvedInstanceId]);

  if (validationError && !isValidating && !loadingInstanceId) {
    return (
      <MainLayout title="Error | ALeA" bgColor={BG_COLOR}>
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (!router.isReady || !courses || isValidating || loadingInstanceId || !resolvedInstanceId) {
    return <CircularProgress />;
  }
  
  const courseInfo = courses[courseId];
  const courseName = courseInfo?.courseName || masterCourses[courseId]?.courseName;
  if (!courseName) {
    router.replace('/');
    return <>Course Not Found!</>;
  }

  const notSignedUp = !fromServer;
  const notes = courseInfo?.notes;

  return (
    <MainLayout title={(courseId || '').toUpperCase() + ` Study Buddy | ALeA`} bgColor={BG_COLOR}>
      <CourseHeader courseName={courseName} imageLink={courseInfo?.imageLink} courseId={courseId} />
      <Box
        fragment-uri={notes}
        fragment-kind="Section"
        sx={{
          maxWidth: '900px',
          m: 'auto',
          px: '10px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {notSignedUp || isEditing ? (
          !isLoading ? (
            <Card sx={{ mt: '20px' }}>
              <CardContent>
                <Typography variant="h5">{t.fillForm}</Typography>
                <br />
                <StudyBuddyForm
                  studyBuddy={userInput}
                  onUpdate={(studyBuddy) => setUserInput(studyBuddy)}
                />
                <FormControlLabel
                  control={
                    <Checkbox value={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                  }
                  label={t.agreementText}
                />
              </CardContent>

              <CardActions>
                <Box display="flex" justifyContent="space-between" width="100%">
                  <Box>
                    <Button
                      variant="contained"
                      onClick={async () => {
                        await updateStudyBuddyInfo(courseId, userInput, institutionId, resolvedInstanceId);
                        location.reload();
                      }}
                      sx={{ mr: '10px' }}
                      disabled={!(agreed && userInput.email?.includes('@'))}
                    >
                      {notSignedUp ? t.join : t.update}
                    </Button>
                    {!notSignedUp && (
                      <Button variant="contained" onClick={() => setIsEditing(false)}>
                        {t.discard}
                      </Button>
                    )}
                  </Box>
                  {fromServer?.active && (
                    <OptOutButton studyBuddy={fromServer} courseId={courseId} institutionId={institutionId} instanceId={resolvedInstanceId} />
                  )}
                </Box>
              </CardActions>
            </Card>
          ) : isLoggedIn() ? (
            <CircularProgress />
          ) : (
            <>{t.loginToContinue}</>
          )
        ) : (
          <>
            <Typography variant="h4">{t.myProfile}</Typography>
            <Card sx={{ mt: '20px' }}>
              <CardContent>
                <StudyBuddyListing studyBuddy={fromServer} />
              </CardContent>
              <CardActions>
                <Button
                  variant="contained"
                  onClick={() => {
                    setIsEditing(true);
                    setUserInput(fromServer);
                  }}
                >
                  {t.editInfo}
                </Button>
                {!fromServer.active && <OptOutButton studyBuddy={fromServer} courseId={courseId} institutionId={institutionId} instanceId={resolvedInstanceId} />}
              </CardActions>
            </Card>
          </>
        )}
        {fromServer && !fromServer.active && (
          <Typography variant="h6" mt="10px">
            {t.notActive}
          </Typography>
        )}

        <StudyBuddyListingTable
          studyBuddies={allBuddies?.connected}
          header={t.connected}
          subText={t.connectedSubtext}
        />
        <StudyBuddyListingTable
          studyBuddies={allBuddies?.requestReceived}
          header={t.requestReceived}
          actionIcon={<HandshakeIcon color="primary" />}
          subText={t.requestReceivedSubtext}
          onAction={(buddy) => {
            connectionRequest(courseId, buddy.userId, institutionId, resolvedInstanceId).then(async () => {
              refetchStudyBuddyLists();
              alert(t.connectedAlert.replace('$1', buddy.userName));
            });
          }}
        />
        <StudyBuddyListingTable
          studyBuddies={allBuddies?.requestSent}
          header={t.requestSent}
          actionIcon={<CancelIcon color="warning" />}
          subText={t.requestSentSubtext}
          onAction={(buddy) => {
            removeConnectionRequest(courseId, buddy.userId, institutionId, resolvedInstanceId).then(async () => {
              refetchStudyBuddyLists();
              alert(t.connectionRequestCancelled.replace('$1', buddy.userName));
            });
          }}
        />
        <StudyBuddyListingTable
          studyBuddies={allBuddies?.other}
          header={t.lookingFor}
          subText={t.lookingForSubtext}
          actionIcon={<ThumbUpAltIcon color="primary" />}
          onAction={(buddy) => {
            connectionRequest(courseId, buddy.userId, institutionId, resolvedInstanceId).then(async () => {
              refetchStudyBuddyLists();
              alert(t.connectionRequestSent.replace('$1', buddy.userName));
            });
          }}
        />
      </Box>
    </MainLayout>
  );
};

export default StudyBuddyPage;
