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
import {
  StudyBuddyForm,
  StudyBuddyListing,
  StudyBuddyListingTable,
  type StudyBuddyLabels,
} from '@alea/react-utils';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useCallback, useEffect, useState } from 'react';
import { getLtiLaunchSession, type LtiLaunchSession } from '../lib/lti-session';

const labels: StudyBuddyLabels = {
  dayPreference: 'Day Preference',
  emailLabel: 'Email',
  emailWarning: 'Your email is only visible to connected study buddies.',
  introLabel: 'Introduce yourself',
  languages: 'Languages',
  languagesLabel: 'Languages you speak',
  meetPreference: 'Meeting Preference',
  meetTypeLabel: 'Preferred Meeting Type',
  nameLabel: 'Name',
  preferredDays: 'Preferred Days',
  semesterLabel: 'Semester',
  studyProgramLabel: 'Study Program',
};

const text = {
  agreementText: 'I agree that my profile is visible to other active study buddies in this course.',
  connected: 'Connected Study Buddies',
  connectedAlert: 'You are now connected with $1.',
  connectedSubtext: 'You can see email addresses after both sides accept.',
  connectionRequestCancelled: 'Connection request to $1 was cancelled.',
  connectionRequestSent: 'Connection request sent to $1.',
  discard: 'Discard',
  editInfo: 'Edit Info',
  fillForm: 'Create Your Study Buddy Profile',
  join: 'Join',
  lookingFor: 'Looking For Study Buddies',
  lookingForSubtext: 'Send a request to someone you would like to study with.',
  myProfile: 'My Profile',
  notActive: 'Your profile is currently inactive.',
  optOut: 'Opt Out',
  optOutPrompt: 'Do you want to opt out of Study Buddy for $1?',
  reJoin: 'Rejoin',
  requestReceived: 'Requests Received',
  requestReceivedSubtext: 'Accept requests from people who want to study with you.',
  requestSent: 'Requests Sent',
  requestSentSubtext: 'Cancel requests you no longer want to keep open.',
  update: 'Update',
};

type Props = {
  session: LtiLaunchSession;
};

export const getServerSideProps = (async ({ req }) => {
  const session = getLtiLaunchSession(req as Parameters<typeof getLtiLaunchSession>[0]);
  if (!session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
}) satisfies GetServerSideProps<Props>;

function OptOutButton({
  studyBuddy,
  courseId,
  institutionId,
  instanceId,
}: {
  studyBuddy: StudyBuddy;
  courseId: string;
  institutionId: string;
  instanceId: string;
}) {
  return (
    <Button
      variant="contained"
      onClick={async () => {
        const prompt = text.optOutPrompt.replace('$1', courseId);
        if (studyBuddy.active && !confirm(prompt)) return;
        await setActive(courseId, !studyBuddy.active, institutionId, instanceId);
        location.reload();
      }}
    >
      {studyBuddy.active ? text.optOut : text.reJoin}
    </Button>
  );
}

export default function StudyBuddyPage({ session }: Props) {
  const courseId = session.courseId;
  const institutionId = session.institutionId;
  const instanceId = session.instanceId;
  const [isLoading, setIsLoading] = useState(true);
  const [fromServer, setFromServer] = useState<StudyBuddy | undefined>(undefined);
  const [allBuddies, setAllBuddies] = useState<GetStudyBuddiesResponse | undefined>(undefined);
  const [userInput, setUserInput] = useState<StudyBuddy>({
    userId: '',
    userName: '',
    intro: '',
    courseId,
    studyProgram: '',
    semester: 1,
    email: session.user.email === 'Not provided' ? '' : session.user.email,
    meetType: MeetType.Both,
    dayPreference: '',
    languages: Languages.Deutsch,
    active: false,
  });
  const [agreed, setAgreed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const refetchStudyBuddyLists = useCallback(() => {
    if (!courseId || !fromServer?.active || !institutionId || !instanceId) return;
    getStudyBuddyList(courseId, institutionId, instanceId).then(setAllBuddies);
  }, [courseId, fromServer?.active, institutionId, instanceId]);

  useEffect(() => {
    refetchStudyBuddyLists();
  }, [refetchStudyBuddyLists]);

  useEffect(() => {
    setIsLoading(true);
    getStudyBuddyUserInfo(courseId, institutionId, instanceId).then((data) => {
      setIsLoading(false);
      setFromServer(data);
    });
  }, [courseId, institutionId, instanceId]);

  const notSignedUp = !fromServer;

  return (
    <>
      <Head>
        <title>{courseId} Study Buddy | ALeA LTI</title>
      </Head>
      <Box
        sx={{ maxWidth: '900px', m: 'auto', p: '24px', display: 'flex', flexDirection: 'column' }}
      >
        <Typography variant="h4">Study Buddy</Typography>
        <Typography variant="subtitle1" sx={{ color: '#555' }}>
          {session.context?.title || session.resourceLink?.title || courseId}
        </Typography>
        {notSignedUp || isEditing ? (
          !isLoading ? (
            <Card sx={{ mt: '20px' }}>
              <CardContent>
                <Typography variant="h5">{text.fillForm}</Typography>
                <br />
                <StudyBuddyForm
                  studyBuddy={userInput}
                  userName={session.user.name}
                  labels={labels}
                  onUpdate={(studyBuddy) => setUserInput(studyBuddy)}
                />
                <FormControlLabel
                  control={
                    <Checkbox value={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                  }
                  label={text.agreementText}
                />
              </CardContent>
              <CardActions>
                <Box display="flex" justifyContent="space-between" width="100%">
                  <Box>
                    <Button
                      variant="contained"
                      onClick={async () => {
                        await updateStudyBuddyInfo(courseId, userInput, institutionId, instanceId);
                        location.reload();
                      }}
                      sx={{ mr: '10px' }}
                      disabled={!(agreed && userInput.email?.includes('@'))}
                    >
                      {notSignedUp ? text.join : text.update}
                    </Button>
                    {!notSignedUp && (
                      <Button variant="contained" onClick={() => setIsEditing(false)}>
                        {text.discard}
                      </Button>
                    )}
                  </Box>
                  {fromServer?.active && (
                    <OptOutButton
                      studyBuddy={fromServer}
                      courseId={courseId}
                      institutionId={institutionId}
                      instanceId={instanceId}
                    />
                  )}
                </Box>
              </CardActions>
            </Card>
          ) : (
            <CircularProgress sx={{ mt: '20px' }} />
          )
        ) : (
          <>
            <Typography variant="h4" mt="24px">
              {text.myProfile}
            </Typography>
            <Card sx={{ mt: '20px' }}>
              <CardContent>
                <StudyBuddyListing studyBuddy={fromServer} labels={labels} />
              </CardContent>
              <CardActions>
                <Button
                  variant="contained"
                  onClick={() => {
                    setIsEditing(true);
                    setUserInput(fromServer);
                  }}
                >
                  {text.editInfo}
                </Button>
                {!fromServer.active && (
                  <OptOutButton
                    studyBuddy={fromServer}
                    courseId={courseId}
                    institutionId={institutionId}
                    instanceId={instanceId}
                  />
                )}
              </CardActions>
            </Card>
          </>
        )}
        {fromServer && !fromServer.active && (
          <Typography variant="h6" mt="10px">
            {text.notActive}
          </Typography>
        )}
        <StudyBuddyListingTable
          studyBuddies={allBuddies?.connected}
          header={text.connected}
          subText={text.connectedSubtext}
          labels={labels}
        />
        <StudyBuddyListingTable
          studyBuddies={allBuddies?.requestReceived}
          header={text.requestReceived}
          actionIcon={<HandshakeIcon color="primary" />}
          subText={text.requestReceivedSubtext}
          labels={labels}
          onAction={(buddy) => {
            connectionRequest(courseId, buddy.userId, institutionId, instanceId).then(async () => {
              refetchStudyBuddyLists();
              alert(text.connectedAlert.replace('$1', buddy.userName));
            });
          }}
        />
        <StudyBuddyListingTable
          studyBuddies={allBuddies?.requestSent}
          header={text.requestSent}
          actionIcon={<CancelIcon color="warning" />}
          subText={text.requestSentSubtext}
          labels={labels}
          onAction={(buddy) => {
            removeConnectionRequest(courseId, buddy.userId, institutionId, instanceId).then(
              async () => {
                refetchStudyBuddyLists();
                alert(text.connectionRequestCancelled.replace('$1', buddy.userName));
              }
            );
          }}
        />
        <StudyBuddyListingTable
          studyBuddies={allBuddies?.other}
          header={text.lookingFor}
          subText={text.lookingForSubtext}
          actionIcon={<ThumbUpAltIcon color="primary" />}
          labels={labels}
          onAction={(buddy) => {
            connectionRequest(courseId, buddy.userId, institutionId, instanceId).then(async () => {
              refetchStudyBuddyLists();
              alert(text.connectionRequestSent.replace('$1', buddy.userName));
            });
          }}
        />
      </Box>
    </>
  );
}
