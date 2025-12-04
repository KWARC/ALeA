import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  List,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import {
  createAcl,
  getCourseAcls,
  getSpecificAclIds,
  isValid,
  updateResourceAction,
} from '@alea/spec';
import { Action, ResourceActionPair } from '@alea/utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AclDisplay from './AclDisplay';
import { useStudentCount } from '../hooks/useStudentCount';
import { useCurrentTermContext } from '../contexts/CurrentTermContext';
import {
  createInstructorResourceActions,
  createMetadataResourceActions,
  createSemesterAclsForCourse,
  createStaffResourceActions,
  createStudentResourceActions,
  isCourseSemesterSetupComplete,
} from 'packages/utils/src/lib/semester-helper';

const ALL_SHORT_IDS = [
  'syllabus',
  'quiz',
  'homework-crud',
  'homework-grading',
  'comments',
  'study-buddy',
  'quiz-preview',
  'quiz-take',
  'homework-take',
  'metadata',
];

export type ShortId = (typeof ALL_SHORT_IDS)[number];

const INITIAL_EDITING_STATE = ALL_SHORT_IDS.reduce(
  (acc, shortId) => ({ ...acc, [shortId]: false }),
  {} as Record<ShortId, boolean>
);

type AclMappings = Record<ShortId, string>;
const EMPTY_ASSIGMENT = ALL_SHORT_IDS.reduce(
  (acc, shortId) => ({ ...acc, [shortId]: '' }),
  {} as AclMappings
);

const staffAccessResources: Record<ShortId, string> = {
  quiz: 'Quiz Management',
  'quiz-preview': 'Quiz Preview',
  'homework-crud': 'Homework Create/Update',
  'homework-grading': 'Homework Grading',
  syllabus: 'Syllabus Management',
  'study-buddy': 'Study Buddy Management',
  comments: 'Comments Moderation',
  metadata: 'Course Metadata',
} as const;

const studentAccessResources: Record<ShortId, string> = {
  'quiz-take': 'Quiz Take',
  'homework-take': 'Homework Take',
};

const getAclShortIdToResourceActionPair = (courseId: string, currentTerm: string) =>
  ({
    syllabus: {
      resourceId: `/course/${courseId}/instance/${currentTerm}/syllabus`,
      actionId: Action.MUTATE,
    },
    quiz: {
      resourceId: `/course/${courseId}/instance/${currentTerm}/quiz`,
      actionId: Action.MUTATE,
    },
    'homework-crud': {
      resourceId: `/course/${courseId}/instance/${currentTerm}/homework`,
      actionId: Action.MUTATE,
    },
    'homework-grading': {
      resourceId: `/course/${courseId}/instance/${currentTerm}/homework`,
      actionId: Action.INSTRUCTOR_GRADING,
    },
    comments: {
      resourceId: `/course/${courseId}/instance/${currentTerm}/comments`,
      actionId: Action.MODERATE,
    },
    'study-buddy': {
      resourceId: `/course/${courseId}/instance/${currentTerm}/study-buddy`,
      actionId: Action.MODERATE,
    },
    'quiz-preview': {
      resourceId: `/course/${courseId}/instance/${currentTerm}/quiz`,
      actionId: Action.PREVIEW,
    },
    'quiz-take': {
      resourceId: `/course/${courseId}/instance/${currentTerm}/quiz`,
      actionId: Action.TAKE,
    },
    'homework-take': {
      resourceId: `/course/${courseId}/instance/${currentTerm}/homework`,
      actionId: Action.TAKE,
    },
    metadata: {
      resourceId: `/course/${courseId}/instance/${currentTerm}/metadata`,
      actionId: Action.MUTATE,
    },
  } as Record<ShortId, ResourceActionPair>);

const CourseAccessControlDashboard = ({ courseId }: { courseId: string }) => {
  const router = useRouter();
  const { currentTermByCourseId, loadingTermByCourseId } = useCurrentTermContext();
  const [semesterSetupLoading, setSemesterSetupLoading] = useState(false);
  const [semesterSetupMessage, setSemesterSetupMessage] = useState('');
  const [isAlreadySetup, setIsAlreadySetup] = useState(false);
  const currentTerm = currentTermByCourseId[courseId];

  async function checkIfAlreadySetup() {
    const complete = await isCourseSemesterSetupComplete(courseId);
    setIsAlreadySetup(!!complete);
  }

  const handleCreateCourseACL = async () => {
    setSemesterSetupLoading(true);
    setSemesterSetupMessage(`Creating semester acl for courseId ${courseId} ...`);
    try {
      await createSemesterAclsForCourse(courseId);
      await createInstructorResourceActions(courseId);
      await createStudentResourceActions(courseId);
      await createStaffResourceActions(courseId);
      await createMetadataResourceActions(courseId);
      setSemesterSetupMessage(`Semester acl setup successful for courseId ${courseId}`);
      window.location.reload();
      await checkIfAlreadySetup();
    } catch (e) {
      setSemesterSetupMessage(`Semester acl setup failed for courseId ${courseId}`);
    } finally {
      setSemesterSetupLoading(false);
    }
  };

  const renderEditableField = (shortId: ShortId) => {
    return isAnyDataEditing[shortId] ? (
      <TextField
        value={editingValues[shortId]}
        onChange={(e) => handleChange(shortId, e.target.value)}
        size="small"
        variant="outlined"
        sx={{
          width: '120px',
          '& .MuiInputBase-input': {
            padding: '4px 8px',
            fontSize: '12px',
          },
        }}
      />
    ) : aclData[shortId] ? (
      <AclDisplay aclId={aclData[shortId]} />
    ) : (
      '-'
    );
  };

  const [isAnyDataEditing, setIsAnyDataEditing] = useState(INITIAL_EDITING_STATE);
  const [editingValues, setEditingValues] = useState(EMPTY_ASSIGMENT);
  const [aclData, setAclData] = useState(EMPTY_ASSIGMENT);
  const [acls, setAcls] = useState<string[]>([]);
  const [newAclId, setNewAclId] = useState('');
  const [error, setError] = useState('');
  const studentCount = useStudentCount(courseId, currentTerm);
  const handleAclClick = (aclId: string) => {
    router.push(`/acl/${aclId}`);
  };

  const handleChange = (field: ShortId, value: string) => {
    setEditingValues({ ...editingValues, [field]: value });
  };

  const handleEditClick = async (field: ShortId) => {
    if (isAnyDataEditing[field]) {
      await updateAclId(field, editingValues[field]);
    }
    setIsAnyDataEditing({ ...isAnyDataEditing, [field]: !isAnyDataEditing[field] });
  };

  const updateAclId = async (shortId: ShortId, aclId: string) => {
    if (!currentTerm) return;
    const aclShortIdToResourceActionPair = getAclShortIdToResourceActionPair(courseId, currentTerm);
    const resourceActionPair = aclShortIdToResourceActionPair[shortId];
    const resourceId = resourceActionPair.resourceId;
    const actionId = resourceActionPair.actionId;
    const res = await isValid(aclId);
    if (!res) {
      console.error('invalid aclId');
      setEditingValues({ ...editingValues, [shortId]: aclData[shortId] });
      return;
    }
    await updateResourceAction({
      resourceId,
      actionId,
      aclId,
    });
    setAclData({ ...aclData, [shortId]: aclId });
    setEditingValues({ ...editingValues, [shortId]: aclId });
  };

  useEffect(() => {
    async function getAclData() {
      if (!currentTerm) return;
      const aclShortIdToResourceActionPair = getAclShortIdToResourceActionPair(
        courseId,
        currentTerm
      );
      const resourceActionPairs = ALL_SHORT_IDS.map((sId) => aclShortIdToResourceActionPair[sId]);
      const aclIds = await getSpecificAclIds(resourceActionPairs);

      const aclData: Record<ShortId, string> = {};
      for (let idx = 0; idx < ALL_SHORT_IDS.length; idx++) {
        aclData[ALL_SHORT_IDS[idx]] = aclIds[idx];
      }
      setAclData(aclData);
      setEditingValues({ ...aclData });
    }
    getAclData();
  }, [courseId, currentTerm]);

  async function getAcls() {
    if (!currentTerm) return;
    const data = await getCourseAcls(courseId, currentTerm);
    setAcls(data);
  }

  useEffect(() => {
    if (!courseId || !currentTerm) return;
    getAcls();
  }, [courseId, currentTerm]);

  useEffect(() => {
    if (courseId) {
      checkIfAlreadySetup();
    }
  }, [courseId, currentTerm]);

  async function handleCreateAclClick() {
    if (!newAclId || !courseId || !currentTerm) return;
    const aclId = `${courseId}-${currentTerm}-${newAclId}`;
    const updaterACLId = `${courseId}-${currentTerm}-instructors`;
    const res = await isValid(updaterACLId);
    if (!res) {
      setNewAclId('');
      return;
    }
    setError('');
    try {
      await createAcl({
        id: aclId,
        description: `${newAclId} for ${courseId} (${currentTerm})`,
        memberUserIds: [],
        memberACLIds: [],
        updaterACLId,
        isOpen: false,
      });
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
    setNewAclId('');
    getAcls();
  }

  if (loadingTermByCourseId) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" maxWidth="900px" m="auto" p="20px" gap="20px">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight="bold">
          Access Control
        </Typography>
        <Button
          variant="contained"
          onClick={handleCreateCourseACL}
          disabled={semesterSetupLoading || isAlreadySetup}
          startIcon={semesterSetupLoading ? <CircularProgress size={20} /> : null}
        >
          {isAlreadySetup ? 'Resource-Action already created' : 'Default Resource-Action Setup'}
        </Button>
      </Box>
      <Typography variant="h5">Staff</Typography>
      <Grid container spacing={1}>
        {Object.entries(staffAccessResources).map(([shortId, displayName]) => (
          <Grid item xs={6} key={shortId}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              p="10px"
              border="1px solid #ddd"
              borderRadius="8px"
              bgcolor="background.default"
            >
              <Typography variant="h6" fontSize="14px">
                {displayName}
              </Typography>
              {renderEditableField(shortId as ShortId)}
              <IconButton
                size="small"
                onClick={() => handleEditClick(shortId as ShortId)}
                disabled={Object.keys(isAnyDataEditing).some(
                  (key) => isAnyDataEditing[key] && key !== shortId
                )}
              >
                {isAnyDataEditing[shortId] ? (
                  <CheckIcon fontSize="small" />
                ) : (
                  <EditIcon fontSize="small" />
                )}
              </IconButton>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Typography variant="h5">Students</Typography>
      <Typography variant="h6">Enrolled Students: {studentCount}</Typography>
      <Grid container spacing={1}>
        {Object.entries(studentAccessResources).map(([shortId, displayName]) => (
          <Grid item xs={6} key={shortId}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              p="10px"
              border="1px solid #ddd"
              borderRadius="8px"
              bgcolor="background.default"
            >
              <Typography variant="h6" fontSize="14px">
                {displayName}
              </Typography>
              {renderEditableField(shortId as ShortId)}
              <IconButton
                size="small"
                onClick={() => handleEditClick(shortId as ShortId)}
                disabled={Object.keys(isAnyDataEditing).some(
                  (key) => isAnyDataEditing[key] && key !== shortId
                )}
              >
                {isAnyDataEditing[shortId] ? (
                  <CheckIcon fontSize="small" />
                ) : (
                  <EditIcon fontSize="small" />
                )}
              </IconButton>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Typography variant="h5">Course Associated ACLs</Typography>
      <List
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        {acls.map((acl, index) => {
          return (
            <Box key={acl} sx={{ flex: '20px 20px 20px' }}>
              <Typography onClick={() => router.push(`/acl/${acl}`)}>
                <AclDisplay aclId={acl} />
              </Typography>
            </Box>
          );
        })}
      </List>
      <Typography variant="h5">Create New ACL</Typography>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <Typography sx={{ ml: 1, fontSize: 14 }}>
          {courseId && currentTerm ? `${courseId}-${currentTerm}-` : ''}
        </Typography>
        <TextField
          value={newAclId}
          onChange={(e) => setNewAclId(e.target.value)}
          size="small"
          sx={{ mb: 0, width: '20%', fontSize: '12px', ml: 0.5, p: 0 }}
          label="New ACL"
        />
        <Button onClick={handleCreateAclClick} variant="contained" sx={{ mt: 0, ml: 1 }}>
          Create
        </Button>
      </Box>
      {error && <Alert severity="error">{'Something went wrong'}</Alert>}
      <Snackbar
        open={!!semesterSetupMessage}
        autoHideDuration={semesterSetupLoading ? null : 4000}
        onClose={() => setSemesterSetupMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={
            semesterSetupLoading
              ? 'info'
              : semesterSetupMessage.includes('successful')
              ? 'success'
              : semesterSetupMessage.includes('failed')
              ? 'error'
              : 'info'
          }
          sx={{ width: '100%' }}
          icon={semesterSetupLoading ? <CircularProgress size={20} /> : undefined}
        >
          {semesterSetupMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CourseAccessControlDashboard;
