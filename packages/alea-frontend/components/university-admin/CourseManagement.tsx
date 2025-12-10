import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  TextField,
  IconButton,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { aclExists } from 'packages/utils/src/lib/semester-helper';
import React, { useEffect, useState } from 'react';
import AclDisplay from '../AclDisplay';
import {
  createAcl,
  getCourseIdsByUniversity,
  addCourseToSemester,
  removeCourseFromSemester,
  createNewCourse,
} from '@alea/spec';

interface CourseManagementProps {
  semester: string;
  universityId: string;
  disabled?: boolean;
}

export const CourseManagement: React.FC<CourseManagementProps> = ({
  semester,
  universityId,
  disabled = false,
}) => {
  const [courses, setCourses] = useState<string[]>([]);
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [aclPresence, setAclPresence] = useState<Record<string, boolean>>({});
  const [aclIds, setAclIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [selectedCourseToAdd, setSelectedCourseToAdd] = useState('');
  const [newCourseDialogOpen, setNewCourseDialogOpen] = useState(false);
  const [newCourseId, setNewCourseId] = useState('');
  const [deleteCourseId, setDeleteCourseId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const hasCourses = courses.length > 0;

  useEffect(() => {
    if (!semester || !universityId) return;
    fetchCoursesAndAcls();
    fetchAvailableCourses();
  }, [semester, universityId]);

  const fetchCoursesAndAcls = async () => {
    if (!semester || !universityId) return;
    setLoading(true);
    try {
      const semesterCourses = await getCourseIdsByUniversity(universityId, semester);
      setCourses(semesterCourses);
      const aclChecks: Record<string, boolean> = {};
      const aclIdMap: Record<string, string> = {};
      await Promise.all(
        semesterCourses.map(async (courseId) => {
          const aclId = `${courseId.toLowerCase()}-${semester}-instructors`;
          aclIdMap[courseId] = aclId;
          aclChecks[courseId] = await aclExists(aclId);
        })
      );
      setAclPresence(aclChecks);
      setAclIds(aclIdMap);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to fetch courses', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCourses = async () => {
    if (!universityId) return;
    try {
      const allCourses = await getCourseIdsByUniversity(universityId);
      setAvailableCourses(allCourses);
    } catch (error) {
      // Silently fail - available courses are optional
    }
  };

  const handleAddCourse = async (courseIdParam?: string) => {
    const targetId = (courseIdParam ?? selectedCourseToAdd).trim();
    if (!targetId || !semester || !universityId) return;
    try {
      const isExistingCourse = availableCourses.includes(targetId);

      if (isExistingCourse) {
        await addCourseToSemester({
          universityId,
          instanceId: semester,
          courseId: targetId,
        });
        setSnackbar({ open: true, message: 'Course added successfully', severity: 'success' });
      } else {
        await createNewCourse({
          universityId,
          instanceId: semester,
          courseId: targetId,
        });
        setSnackbar({
          open: true,
          message: 'New course created and added to this semester',
          severity: 'success',
        });
      }

      await fetchCoursesAndAcls();
      await fetchAvailableCourses();
      setSelectedCourseToAdd('');
    } catch (error: any) {
      const message = error?.response?.data || 'Failed to add course';
      setSnackbar({ open: true, message: String(message), severity: 'error' });
    }
  };

  const handleRemoveCourse = async (courseId: string) => {
    if (!semester || !universityId) return;
    try {
      await removeCourseFromSemester({
        universityId,
        instanceId: semester,
        courseId,
      });
      await fetchCoursesAndAcls();
      setSnackbar({ open: true, message: 'Course removed successfully', severity: 'success' });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.response?.data || 'Failed to remove course';

      if (errorMessage.includes('Notes are present') || errorMessage.includes('notes')) {
        window.alert('Notes are present. To delete this course, please delete notes first.');
      } else {
        setSnackbar({ open: true, message: String(errorMessage), severity: 'error' });
      }
    }
  };

  const handleCreateAcl = async (aclId: string, courseId: string) => {
    try {
      await createAcl({
        id: aclId,
        description: `Instructor ACL for ${aclId}`,
        isOpen: false,
        updaterACLId: `${universityId.toLocaleLowerCase()}-admin`,
        memberUserIds: [],
        memberACLIds: [],
      });
      const exists = await aclExists(aclId);
      setAclPresence((prev) => ({ ...prev, [courseId]: exists }));
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to create ACL', severity: 'error' });
    }
  };

  const handleAddNewCourse = async () => {
    if (!newCourseId || !semester || !universityId) return;
    try {
      await createNewCourse({
        universityId,
        instanceId: semester,
        courseId: newCourseId,
      });
      await fetchCoursesAndAcls();
      await fetchAvailableCourses();
      setNewCourseId('');
      setNewCourseDialogOpen(false);
      setSnackbar({ open: true, message: 'New course added successfully', severity: 'success' });
    } catch (error: any) {
      const message = error?.response?.data || 'Failed to add new course';
      setSnackbar({ open: true, message: String(message), severity: 'error' });
    }
  };

  const coursesNotInSemester = availableCourses.filter((c) => !courses.includes(c));

  return (
    <Paper elevation={2} sx={{ mb: 4, p: 2, borderRadius: 3, background: '#fff' }}>
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ color: 'primary.dark', fontWeight: 600 }}>
            Course Management
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Autocomplete
            freeSolo
            options={coursesNotInSemester}
            value={selectedCourseToAdd}
            onChange={(_, newValue) => {
              if (newValue === '__ADD_NEW__') {
                setNewCourseId(selectedCourseToAdd.trim());
                setNewCourseDialogOpen(true);
                setSelectedCourseToAdd('');
                return;
              }
              const value = typeof newValue === 'string' ? newValue.trim() : '';
              if (value && value !== '__ADD_NEW__') {
                void handleAddCourse(value);
              }
              setSelectedCourseToAdd('');
            }}
            onInputChange={(_, newInputValue) => {
              setSelectedCourseToAdd(newInputValue);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && selectedCourseToAdd?.trim()) {
                event.preventDefault();
                const value = selectedCourseToAdd.trim();
                if (value) {
                  void handleAddCourse(value);
                  setSelectedCourseToAdd('');
                }
              }
            }}
            sx={{ minWidth: 250 }}
            disabled={disabled}
            filterOptions={(options, params) => {
              const filtered = options.filter((option) =>
                option.toLowerCase().includes(params.inputValue.toLowerCase())
              );

              const inputValue = params.inputValue.trim().toLowerCase();
              const isExisting = options.some((opt) => opt.toLowerCase() === inputValue);

              if (inputValue && !isExisting) {
                filtered.push('__ADD_NEW__' as any);
              }

              return filtered;
            }}
            getOptionLabel={(option) => {
              if (option === '__ADD_NEW__') {
                return `Add "${selectedCourseToAdd || 'new course'}" as new course`;
              }
              return option;
            }}
            renderOption={(props, option) => {
              if (option === '__ADD_NEW__') {
                return (
                  <Box component="li" {...props} key="__ADD_NEW__">
                    <Button
                      fullWidth
                      startIcon={<AddIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewCourseId(selectedCourseToAdd.trim());
                        setNewCourseDialogOpen(true);
                        setSelectedCourseToAdd('');
                      }}
                      sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                    >
                      Add "{selectedCourseToAdd || 'new course'}" as new course
                    </Button>
                  </Box>
                );
              }
              return (
                <Box component="li" {...props} key={option}>
                  {option}
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Add Course To Semester"
                placeholder={
                  coursesNotInSemester.length === 0
                    ? 'Type a new or existing courseId'
                    : 'Select or type a courseId'
                }
                size="small"
              />
            )}
          />
        </Box>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ background: '#e3f0ff' }}>
              <TableCell sx={{ fontWeight: 600 }}>CourseId</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Instructors</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : !hasCourses ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No courses found for this semester. Please add courses.
                </TableCell>
              </TableRow>
            ) : (
              courses.map((courseId, idx) => (
                <TableRow
                  key={courseId}
                  sx={{
                    backgroundColor: idx % 2 === 0 ? '#f5f7fa' : '#e9eef6',
                    '&:hover': { backgroundColor: '#e3f0ff' },
                    transition: 'background 0.2s',
                  }}
                >
                  <TableCell>{courseId}</TableCell>
                  <TableCell>
                    {aclPresence[courseId] === undefined ? (
                      'Checking...'
                    ) : aclPresence[courseId] ? (
                      <AclDisplay aclId={aclIds[courseId]} />
                    ) : (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleCreateAcl(aclIds[courseId], courseId)}
                        disabled={disabled}
                      >
                        Create Instructor ACL
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => setDeleteCourseId(courseId)}
                      disabled={disabled}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={newCourseDialogOpen}
        onClose={() => setNewCourseDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Course</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Course ID"
              value={newCourseId}
              onChange={(e) => setNewCourseId(e.target.value)}
              fullWidth
              required
              placeholder="e.g., CS101"
              helperText="Enter a unique course identifier"
            />
            <Alert severity="info">
              A basic course metadata entry will be created. You can update course details later.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCourseDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddNewCourse} disabled={!newCourseId}>
            Add Course
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deleteCourseId}
        onClose={() => setDeleteCourseId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Course</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete course <strong>{deleteCourseId}</strong> from this
            semester?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCourseId(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (!deleteCourseId) return;
              handleRemoveCourse(deleteCourseId);
              setDeleteCourseId(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};
