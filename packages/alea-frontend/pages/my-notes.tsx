import {
  Box,
  CircularProgress,
  Typography,
  TextField,
  Select,
  FormControl,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  MenuItem,
  useTheme,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import FolderIcon from '@mui/icons-material/Folder';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { getMyNotesSections } from '@alea/spec';
import { NotesView } from '@alea/comments';
import type { NextPage } from 'next';
import { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';

export interface NotesSection {
  uri: string;
  courseId: string;
  courseTerm: string;
  updatedTimestampSec: number;
}

interface GroupedNotes {
  [courseId: string]: {
    [instanceId: string]: NotesSection[];
  };
}

const MyNotesPage: NextPage = () => {
  const theme = useTheme();
  const [sections, setSections] = useState<NotesSection[]>([]);
  const [groupedNotes, setGroupedNotes] = useState<GroupedNotes>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');

  useEffect(() => {
    getMyNotesSections()
      .then(setSections)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const grouped: GroupedNotes = {};

    sections.forEach((section) => {
      const courseId = section.courseId || 'default';
      const instanceId = section.courseTerm || 'default';

      if (!grouped[courseId]) {
        grouped[courseId] = {};
      }
      if (!grouped[courseId][instanceId]) {
        grouped[courseId][instanceId] = [];
      }
      grouped[courseId][instanceId].push(section);
    });
    setGroupedNotes(grouped);
  }, [sections]);

  if (loading) return <CircularProgress />;

  return (
    <MainLayout title="My Notes | ALeA">
      <Box display="flex" minHeight="calc(100vh - 64px)" bgcolor="background.default">
        <Box bgcolor="background.default" p={3} sx={myNotesPageStyles.sidebar}>
          <Typography variant="h6" mb={3} fontWeight={700} color="text.primary">
            Courses
          </Typography>
          <List sx={{ px: 0 }}>
            <ListItemButton
              selected={selectedCourse === 'all'}
              onClick={() => setSelectedCourse('all')}
              sx={myNotesPageStyles.listItemButton}
            >
              <ListItemIcon
                sx={[
                  myNotesPageStyles.listItemIcon,
                  selectedCourse === 'all' && { color: 'inherit' },
                ]}
              >
                <LibraryBooksIcon />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography fontWeight={selectedCourse === 'all' ? 700 : 500}>
                    All Courses
                  </Typography>
                }
              />
            </ListItemButton>
            {Object.keys(groupedNotes).map((courseId) => (
              <ListItemButton
                key={courseId}
                selected={selectedCourse === courseId}
                onClick={() => setSelectedCourse(courseId)}
                sx={myNotesPageStyles.listItemButton}
              >
                <ListItemIcon
                  sx={[
                    myNotesPageStyles.listItemIcon,
                    selectedCourse === courseId && { color: 'inherit' },
                  ]}
                >
                  <FolderIcon />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography fontWeight={selectedCourse === courseId ? 700 : 500}>
                      {courseId.toUpperCase()}
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
        <Box flex={1} p={{ xs: 2, md: 5 }} bgcolor="background.paper">
          <Box maxWidth="1000px" mx="auto">
            <Typography
              variant="h3"
              fontWeight={800}
              color="text.primary"
              mb={4}
              letterSpacing="-0.02em"
            >
              {selectedCourse === 'all' ? 'All Notes' : `${selectedCourse.toUpperCase()} $Notes`}
            </Typography>
            <Box mb={5} display="flex" flexDirection="column" gap={2}>
              <TextField
                fullWidth
                placeholder="Search my notes..."
                variant="outlined"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={myNotesPageStyles.searchField(theme)}
              />
              <FormControl sx={{ display: { xs: 'block', md: 'none' } }} fullWidth>
                <InputLabel>Course</InputLabel>
                <Select
                  value={selectedCourse}
                  label="Course"
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  sx={myNotesPageStyles.mobileSelect}
                >
                  <MenuItem value="all">All Courses</MenuItem>
                  {Object.keys(groupedNotes).map((courseId) => (
                    <MenuItem key={courseId} value={courseId}>
                      {courseId.toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {Object.entries(groupedNotes)
              .filter(([courseId]) => selectedCourse === 'all' || courseId === selectedCourse)
              .map(([courseId, instances]) => (
                <Box key={courseId} mb={6}>
                  {Object.entries(instances).map(([instanceId, sections]) => (
                    <Box
                      key={instanceId}
                      mb={4}
                      sx={{
                        display: 'block',
                        '@supports selector(:has(a))': {
                          '&:not(:has(.alea-note-card))': {
                            display: 'none',
                          },
                        },
                      }}
                    >
                      <Typography
                        variant="h5"
                        sx={{
                          mb: 3,
                          color: 'text.primary',
                          fontWeight: 700,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {courseId.toUpperCase()} ({instanceId})
                      </Typography>
                      {sections.map((section) => (
                        <NotesView
                          key={`${section.uri}-${instanceId}`}
                          uri={section.uri}
                          allNotesMode={true}
                          searchQuery={searchQuery}
                          courseId={courseId}
                          courseTerm={instanceId}
                        />
                      ))}
                    </Box>
                  ))}
                </Box>
              ))}
          </Box>
        </Box>
      </Box>
    </MainLayout>
  );
};

const myNotesPageStyles = {
  sidebar: {
    width: 240,
    borderRight: '1px solid',
    borderColor: 'divider',
    display: { xs: 'none', md: 'block' },
  },
  listItemButton: {
    borderRadius: 2,
    mb: 1,
    '&.Mui-selected': {
      bgcolor: 'action.selected',
      color: 'primary.main',
      '&:hover': { bgcolor: 'action.hover' },
    },
  },
  listItemIcon: {
    minWidth: 40,
    color: 'text.secondary',
  },
  searchField: (theme: Theme) => ({
    '& .MuiOutlinedInput-root': {
      borderRadius: 4,
      bgcolor: 'background.paper',
      boxShadow: theme.shadows[1],
    },
  }),
  mobileSelect: {
    borderRadius: 3,
  },
};

export default MyNotesPage;
