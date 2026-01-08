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
  Languages,
  MeetType,
  removeConnectionRequest,
  setActive,
  StudyBuddy,
  updateStudyBuddyInfo,
} from '@alea/spec';
import { BG_COLOR, CourseInfo, MaAI_COURSES } from '@alea/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { StudyBuddyForm } from '../../components/StudyBuddyForm';
import { StudyBuddyListing, StudyBuddyListingTable } from '../../components/StudyBuddyListingTable';
import { getLocaleObject } from '../../lang/utils';
import MainLayout from '../../layouts/MainLayout';
import { CourseHeader } from '../course-home/[courseId]';
import { useIsLoggedIn } from '@alea/react-utils';

function OptOutButton({ studyBuddy, courseId }: { studyBuddy: StudyBuddy; courseId: string }) {
  const { studyBuddy: t } = getLocaleObject(useRouter());
  return (
    <Button
      variant="contained"
      onClick={async () => {
        const prompt = t.optOutPrompt.replace('$1', courseId);
        if (studyBuddy.active && !confirm(prompt)) return;
        await setActive(courseId, !studyBuddy.active);
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
  const courseId = router.query.courseId as string;
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
  const refetchStudyBuddyLists = useCallback(() => {
    if (!courseId || !fromServer?.active) return;
    if (courseId) getStudyBuddyList(courseId).then(setAllBuddies);
  }, [courseId, fromServer?.active]);
  const { loggedIn } = useIsLoggedIn();
  useEffect(() => {
    getAllCourses().then(setCourses);
  }, []);

  useEffect(() => {
    refetchStudyBuddyLists();
  }, [courseId, refetchStudyBuddyLists]);

  useEffect(() => {
    if (!courseId || !loggedIn) return;
    setIsLoading(true);
    getStudyBuddyUserInfo(courseId).then((data) => {
      setIsLoading(false);
      setFromServer(data);
    });
  }, [courseId,loggedIn]);

  if (!router.isReady || !courses) return <CircularProgress />;
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
                        await updateStudyBuddyInfo(courseId, userInput);
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
                    <OptOutButton studyBuddy={fromServer} courseId={courseId} />
                  )}
                </Box>
              </CardActions>
            </Card>
          ) : loggedIn? (
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
                {!fromServer.active && <OptOutButton studyBuddy={fromServer} courseId={courseId} />}
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
            connectionRequest(courseId, buddy.userId).then(async () => {
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
            removeConnectionRequest(courseId, buddy.userId).then(async () => {
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
            connectionRequest(courseId, buddy.userId).then(async () => {
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
