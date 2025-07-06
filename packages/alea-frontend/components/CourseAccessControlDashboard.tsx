import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import { Alert, Box, Button, Grid, IconButton, List, TextField, Typography } from '@mui/material';
import {
  createAcl,
  getCourseAcls,
  getSpecificAclIds,
  isValid,
  updateResourceAction,
} from '@stex-react/api';
import { Action, CURRENT_TERM, ResourceActionPair } from '@stex-react/utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AclDisplay from './AclDisplay';
import { useStudentCount } from '../hooks/useStudentCount';

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
  'quiz': 'Quiz Management',
  'quiz-preview': 'Quiz Preview',
  'homework-crud': 'Homework Create/Update',
  'homework-grading': 'Homework Grading',
  'syllabus': 'Syllabus Management',
  'study-buddy': 'Study Buddy Management',
  'comments': 'Comments Moderation',
} as const;

const studentAccessResources: Record<ShortId, string> = {
  'quiz-take': 'Quiz Take',
  'homework-take': 'Homework Take',
};

const getAclShortIdToResourceActionPair = (courseId: string) =>
  ({
    'syllabus': {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/syllabus`,
      actionId: Action.MUTATE,
    },
    'quiz': {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/quiz`,
      actionId: Action.MUTATE,
    },
    'homework-crud': {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/homework`,
      actionId: Action.MUTATE,
    },
    'homework-grading': {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/homework`,
      actionId: Action.INSTRUCTOR_GRADING,
    },
    'comments': {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/comments`,
      actionId: Action.MODERATE,
    },
    'study-buddy': {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/study-buddy`,
      actionId: Action.MODERATE,
    },
    'quiz-preview': {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/quiz`,
      actionId: Action.PREVIEW,
    },
    'quiz-take': {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/quiz`,
      actionId: Action.TAKE,
    },
    'homework-take': {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/homework`,
      actionId: Action.TAKE,
    },
  } as Record<ShortId, ResourceActionPair>);

const CourseAccessControlDashboard = ({ courseId }) => {
  const router = useRouter();
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
  const studentCount = useStudentCount(courseId, CURRENT_TERM);
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
    const aclShortIdToResourceActionPair = getAclShortIdToResourceActionPair(courseId);
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
      const aclShortIdToResourceActionPair = getAclShortIdToResourceActionPair(courseId);
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
  }, [courseId]);

  async function getAcls() {
    const data = await getCourseAcls(courseId, CURRENT_TERM);
    setAcls(data);
  }

  useEffect(() => {
    if (!courseId) return;
    getAcls();
  }, [courseId]);

  async function handleCreateAclClick() {
    if (!newAclId || !courseId) return;
    const aclId = `${courseId}-${CURRENT_TERM}-${newAclId}`;
    const updaterACLId = `${courseId}-${CURRENT_TERM}-instructors`;
    const res = await isValid(updaterACLId);
    if (!res) {
      setNewAclId('');
      return;
    }
    setError('');
    try {
      await createAcl({
        id: aclId,
        description: `${newAclId} for ${courseId} (${CURRENT_TERM})`,
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

  return (
    <Box display="flex" flexDirection="column" maxWidth="900px" m="auto" p="20px" gap="20px">
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
      <Typography variant='h6'>Enrolled Students: {studentCount}</Typography>
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
          {courseId ? `${courseId}-${CURRENT_TERM}-` : ''}
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
    </Box>
  );
};

export default CourseAccessControlDashboard;
