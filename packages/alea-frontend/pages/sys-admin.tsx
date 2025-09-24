import { DateView } from '@alea/react-utils';
import {
  createResourceAction,
  deleteResourceAction,
  getAllResourceActions,
  getCourseInfo,
  isUserMember,
  isValid,
  recomputeMemberships,
  UpdateResourceAction,
  updateResourceAction
} from '@alea/spec';
import {
  Action,
  ALL_RESOURCE_TYPES,
  ComponentType,
  CourseInfo,
  CURRENT_TERM,
  RESOURCE_TYPE_MAP,
  ResourceIdComponent,
  ResourceName,
} from '@alea/utils';
import { Delete as DeleteIcon } from '@mui/icons-material';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AclDisplay from '../components/AclDisplay';
import RecorrectionChecker from '../components/RecorrectionChecker';
import MainLayout from '../layouts/MainLayout';

const SysAdmin: NextPage = () => {
  const router = useRouter();
  const [aclId, setAclId] = useState<string | null>('');
  const [resourceType, setResourceType] = useState<ResourceName | ''>('');
  const [resourceComponents, setResourceComponents] = useState<ResourceIdComponent[]>([]);
  const [possibleActions, setPossibleActions] = useState<Action[]>([]);
  const [resourceId, setResourceId] = useState<string>('');
  const [actionId, setActionId] = useState<Action | ''>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState('');
  const [resourceActions, setResourceActions] = useState([]);
  const [isRecomputing, setIsRecomputing] = useState<boolean>(false);
  const [editing, setEditing] = useState<UpdateResourceAction | null>(null);
  const [newAclId, setNewAclId] = useState<string | null>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteResource, setDeleteResource] = useState<{
    resourceId: string;
    actionId: string;
  } | null>(null);
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo }>({});
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  async function getAllResources() {
    try {
      const data = await getAllResourceActions();
      setResourceActions(data);
    } catch (e) {
      console.error(e);
    }
  }
  async function loadCurrentSemCourses() {
    try {
      const courseData = await getCourseInfo();
      const filteredCourses = Object.entries(courseData).reduce((acc, [courseId, courseInfo]) => {
        if (
          courseInfo.instances &&
          courseInfo.instances.some((instance) => instance.semester === CURRENT_TERM)
        ) {
          acc[courseId] = courseInfo;
        }
        return acc;
      }, {} as { [id: string]: CourseInfo });

      setCourses(filteredCourses);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    isUserMember('sys-admin').then((isSysAdmin) => {
      if (!isSysAdmin) router.push('/');
    });
    getAllResources();
    loadCurrentSemCourses();
  }, []);

  useEffect(() => {
    if (resourceType) {
      const resourceTypeObject = RESOURCE_TYPE_MAP.get(resourceType);
      if (resourceTypeObject) {
        setResourceComponents(resourceTypeObject.components);
        setPossibleActions(resourceTypeObject.possibleActions);
      }
    }
  }, [resourceType]);

  useEffect(() => {
    if (selectedCourseId && resourceType === ResourceName.COURSE_ACCESS) {
      setResourceComponents((prevComponents) => {
        return prevComponents.map((component) => {
          if (component.name === 'courseId') {
            return { ...component, value: selectedCourseId };
          }
          return component;
        });
      });

      const aclId = `${selectedCourseId}-${CURRENT_TERM}-instructors`;
      setAclId(aclId);
    }
  }, [selectedCourseId, resourceType]);

  async function handleRecomputeClick() {
    try {
      setIsRecomputing(true);
      await recomputeMemberships();
      setIsRecomputing(false);
    } catch (e) {
      console.log(e);
      setIsRecomputing(false);
    }
  }

  async function handleCreateClick() {
    if (!aclId || !resourceType || !actionId) return;
    const resourceTypeObject = RESOURCE_TYPE_MAP.get(resourceType);
    if (!resourceTypeObject) return;
    try {
      const isAclValid = await isValid(aclId);
      if (!isAclValid) {
        setAclId('');
        setError('invalid acl id');
        setIsSubmitting(false);
        return;
      }
      const id = '/' + resourceComponents.map((component) => component.value).join('/');
      setResourceId(id);

      setIsSubmitting(true);
      await createResourceAction({ aclId, resourceId, actionId });
      setResourceActions((prev) => [
        ...prev,
        {
          aclId,
          resourceId,
          actionId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      setAclId('');
      setResourceType('');
      setActionId('');
      setError('');
      setIsSubmitting(false);
      getAllResources();
      setResourceId('');
      setResourceComponents([]);
    } catch (e) {
      console.log(e);
      setError(e.response.data.message);
      setIsSubmitting(false);
    }
  }

  async function handleUpdateClick(resourceId: string, actionId: string) {
    try {
      if (!(await isValid(newAclId))) {
        setError('Invalid ACL');
        return;
      }
      await updateResourceAction({ resourceId, actionId, aclId: newAclId });
      setEditing(null);
      setNewAclId('');
      setError('');
      setResourceActions((prev) =>
        prev.map((entry) =>
          entry.resourceId === resourceId && entry.actionId === actionId
            ? { ...entry, aclId: newAclId, updatedAt: new Date().toISOString() }
            : entry
        )
      );
    } catch (e) {
      console.log(e);
      setError(e.response.data.message);
    }
  }

  const handleEditClick = ({ aclId, actionId, resourceId }: UpdateResourceAction) => {
    setEditing({ aclId, actionId, resourceId });
    setNewAclId(aclId);
  };

  function handleDeleteClickForEntry(resId: string, actionId: string) {
    setDeleteDialogOpen(true);
    setDeleteResource({ resourceId: resId, actionId: actionId });
  }

  function handleDeleteCancel() {
    setDeleteDialogOpen(false);
    setDeleteResource(null);
  }

  async function handleDeleteConfirm() {
    try {
      if (deleteResource) {
        await deleteResourceAction(deleteResource.resourceId, deleteResource.actionId);
        setResourceActions((prev) =>
          prev.filter(
            (entry) =>
              entry.resourceId !== deleteResource.resourceId ||
              entry.actionId !== deleteResource.actionId
          )
        );
        setDeleteDialogOpen(false);
        setDeleteResource(null);
      } else {
        console.warn('Attempted to confirm delete with no resource selected.');
        setDeleteDialogOpen(false);
      }
    } catch (e) {
      console.error(e);

      setDeleteDialogOpen(false);
      setDeleteResource(null);
    }
  }

  const handleComponentChange = (index: number, value: string) => {
    setResourceComponents((prev) =>
      prev.map((component, idx) => (idx === index ? { ...component, value } : component))
    );
  };

  useEffect(() => {
    const id = '/' + resourceComponents.map((component) => component.value).join('/');
    setResourceId(id);
  }, [resourceComponents]);

  const handleActionClick = (actionId: Action) => {
    setActionId(actionId);
  };
  const handleCourseSelection = (courseId: string) => {
    setSelectedCourseId(courseId);
    if (courseId) {
      setResourceType(ResourceName.COURSE_ACCESS);
      setActionId(Action.ACCESS_CONTROL);
    } else {
      setResourceType('');
      setActionId('');
      setResourceComponents([]);
      setAclId('');
    }
  };

  return (
    <MainLayout>
      <Box
        sx={{
          m: '0 auto',
          maxWidth: { xs: '95%', md: '90%', lg: '1200px' },
          p: { xs: '10px', sm: '20px' },
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <Button
          sx={{
            display: 'flex',
            alignItems: 'center',
            margin: '20px auto',
          }}
          variant="contained"
          color="primary"
          disabled={isRecomputing}
          onClick={() => handleRecomputeClick()}
        >
          Recompute Memberships
        </Button>
        <Link href={`/acl`}>
          <Button
            sx={{
              display: 'flex',
              alignItems: 'center',
              margin: '10px auto',
            }}
            variant="contained"
            color="primary"
          >
            ACL Page
          </Button>
        </Link>
        <RecorrectionChecker />
        <Box
          sx={{
            m: '0 auto',
            maxWidth: '100%',
            p: { xs: '15px', sm: '20px' },
            boxSizing: 'border-box',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px',
            mt: 4,
          }}
        >
          <Typography fontSize={22} m="10px 0">
            Resource-Action Assignments
          </Typography>
          <Typography fontSize={16} m="10px 0" color="text.secondary">
            Quick Course Access Setup
          </Typography>
          <Select
            fullWidth
            value={selectedCourseId}
            onChange={(e) => handleCourseSelection(e.target.value)}
            displayEmpty
            variant="outlined"
            size="small"
            sx={{ mb: '20px' }}
          >
            <MenuItem value="">
              <em>Select a Course (Auto-fills course access forms)</em>
            </MenuItem>
            {Object.entries(courses).map(([courseId, courseInfo]) => (
              <MenuItem key={courseId} value={courseId}>
                {courseId} - {courseInfo.courseName}
              </MenuItem>
            ))}
          </Select>

          {selectedCourseId && (
            <Box
              sx={{
                backgroundColor: '#e3f2fd',
                border: '1px solid #2196f3',
                borderRadius: '8px',
                p: '15px',
                mb: '20px',
              }}
            >
              <Typography fontSize={14} fontWeight="bold" color="primary" mb="10px">
                Course Access Setup for: <strong>{selectedCourseId}</strong>
              </Typography>
              <Typography fontSize={13} color="text.secondary" mb="15px">
                Course access form is auto-filled when you select a course above.
              </Typography>
            </Box>
          )}
          <Typography fontSize={16} m="10px 0" color="text.secondary">
            Manual Resource Type Selection
          </Typography>
          <Select
            fullWidth
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value as ResourceName)}
            displayEmpty
            variant="outlined"
            size="small"
          >
            <MenuItem value="">
              <em>Select Resource Type</em>
            </MenuItem>
            {ALL_RESOURCE_TYPES.map((type) => (
              <MenuItem key={type.name} value={type.name}>
                {type.name}
              </MenuItem>
            ))}
          </Select>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '5px', my: '5px' }}>
            {resourceComponents.map((component, index) => (
              <TextField
                key={index}
                margin="normal"
                label={component.name || component.value}
                value={component.value}
                onChange={(e) => handleComponentChange(index, e.target.value)}
                variant="outlined"
                disabled={component.type !== ComponentType.VARIABLE}
                size="small"
                sx={{ flex: '1 1 calc(20% - 10px)', minWidth: '120px' }}
              />
            ))}
          </Box>
          <TextField
            label="Resource ID"
            variant="outlined"
            value={resourceId}
            size="small"
            sx={{ mb: '20px' }}
            fullWidth
            disabled
          />
          <Select
            fullWidth
            value={actionId}
            onChange={(e) => handleActionClick(e.target.value as Action)}
            displayEmpty
            variant="outlined"
            size="small"
            disabled={!resourceType}
            sx={{ mb: '20px' }}
          >
            <MenuItem value="">
              <em>Select Action</em>
            </MenuItem>
            {possibleActions.map((action) => (
              <MenuItem key={action} value={action}>
                {action}
              </MenuItem>
            ))}
          </Select>
          {error && (
            <Typography color="error" margin="normal" sx={{ mb: '20px' }}>
              {error}
            </Typography>
          )}
          <TextField
            fullWidth
            margin="normal"
            label="ACL ID"
            value={aclId}
            onChange={(e) => setAclId(e.target.value)}
            variant="outlined"
            size="small"
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateClick}
            disabled={isSubmitting || !aclId || !resourceId || !actionId}
            sx={{ alignSelf: 'center' }}
          >
            {selectedCourseId && resourceType === ResourceName.COURSE_ACCESS
              ? `Add ${resourceType} Assignment`
              : 'Add New Assignment'}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', my: 4 }}>
          <Typography variant="h6">Resource Access Management</Typography>
        </Box>
        <TableContainer component={Paper} sx={{ margin: 'auto', overflow: 'auto', mt: 2 }}>
          <Table sx={{ minWidth: 650 }} aria-label="resource actions table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Resource ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Action ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ACL ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Created At</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Updated At</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {resourceActions.map((entry) => (
                <TableRow key={`${entry.resourceId}-${entry.actionId}`}>
                  <TableCell sx={{ wordBreak: 'break-word' }}>{entry.resourceId}</TableCell>
                  <TableCell sx={{ wordBreak: 'break-word' }}>{entry.actionId}</TableCell>
                  <TableCell>
                    {error &&
                      editing?.aclId === entry.aclId &&
                      editing?.resourceId === entry.resourceId &&
                      editing?.actionId === entry.actionId && (
                        <Typography
                          color="error"
                          pb="5px"
                          variant="body2"
                          sx={{ fontSize: '0.8rem' }}
                        >
                          {error}
                        </Typography>
                      )}
                    {editing?.aclId === entry.aclId &&
                    editing?.resourceId === entry.resourceId &&
                    editing?.actionId === entry.actionId ? (
                      <TextField
                        value={newAclId}
                        onChange={(e) => setNewAclId(e.target.value)}
                        size="small"
                      />
                    ) : (
                      <AclDisplay aclId={entry.aclId} />
                    )}
                  </TableCell>
                  <TableCell>
                    <DateView timestampMs={new Date(entry.createdAt).getTime()} />
                  </TableCell>
                  <TableCell>
                    <DateView timestampMs={new Date(entry.updatedAt).getTime()} />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    {editing?.aclId === entry.aclId &&
                    editing?.resourceId === entry.resourceId &&
                    editing?.actionId === entry.actionId ? (
                      <IconButton
                        color="primary"
                        onClick={() => handleUpdateClick(entry.resourceId, entry.actionId)}
                      >
                        <CheckIcon />
                      </IconButton>
                    ) : (
                      <IconButton color="primary" onClick={() => handleEditClick(entry)}>
                        <EditIcon />
                      </IconButton>
                    )}
                    <IconButton
                      color="warning"
                      onClick={() => handleDeleteClickForEntry(entry.resourceId, entry.actionId)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">Confirm Delete</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              Are you sure you want to delete the resource action with ID:{' '}
              {deleteResource?.resourceId}?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel} color="primary">
              Cancel
            </Button>
            <Button onClick={handleDeleteConfirm} color="error" autoFocus>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
};

export default SysAdmin;
