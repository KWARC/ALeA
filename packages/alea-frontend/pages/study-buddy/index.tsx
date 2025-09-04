import { Diversity3 } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AllCoursesStats,
  GetSortedCoursesByConnectionsResponse,
  UserInfo,
  UserStats,
  canModerateStudyBuddy,
  getAllUsersStats,
  getEnrolledCourseIds,
  getStudyBuddyCoursesSortedbyConnections,
  getStudyBuddyUsersStats,
  getUserInfo,
} from '@stex-react/spec';
import { MaAI_COURSES, PRIMARY_COL, localStore } from '@stex-react/utils';
import type { NextPage } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useReducer, useState } from 'react';
import StudyBuddyModeratorOverview from '../../components/StudyBuddyModeratorOverview';
import { getLocaleObject } from '../../lang/utils';
import MainLayout from '../../layouts/MainLayout';
const StudyBuddyConnectionsGraph = dynamic(
  () => import('../../components/StudyBuddyConnectionsGraph'),
  { ssr: false }
);

const RECENT_COURSE_KEY = 'recent-study-buddy-courses';
function getRecentCourses() {
  const chosenCourses = localStore?.getItem(RECENT_COURSE_KEY);
  if (chosenCourses) {
    return chosenCourses.split(',');
  } else {
    return [];
  }
}
function addRecentCourse(courseCode: string) {
  const chosenCourses = getRecentCourses();
  if (!chosenCourses.includes(courseCode)) {
    chosenCourses.push(courseCode);
    localStore?.setItem(RECENT_COURSE_KEY, chosenCourses.join(','));
  }
}
function removeRecentCourse(courseCode: string) {
  const chosenCourses = getRecentCourses();
  if (chosenCourses.includes(courseCode)) {
    localStore?.setItem(RECENT_COURSE_KEY, chosenCourses.filter((c) => c !== courseCode).join(','));
  }
}
function StudyBuddyOverviewGraph({ instanceId }: { instanceId: string }) {
  const [sortedCourses, setSortedCourses] = useState<GetSortedCoursesByConnectionsResponse[]>();
  const [selectedCourseIndex, setSelectedCourseIndex] = useState<string>(null);
  const [connections, setConnections] = useState<UserStats['connections']>([]);
  const [userIdsAndActiveStatus, setUserIdsAndActiveStatus] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const data = await getStudyBuddyCoursesSortedbyConnections(instanceId);
      setSortedCourses(data);
      setIsLoading(false);
    };
    fetchData();
  }, [instanceId]);

  const handleListItemClick = async (courseId: string) => {
    setSelectedCourseIndex(courseId);
    const data = await getStudyBuddyUsersStats(courseId, instanceId);
    setConnections(data.connections);
    setUserIdsAndActiveStatus(data.userIdsAndActiveStatus);
  };

  const courseList = sortedCourses?.map((c, i) => (
    <ListItemButton
      key={i}
      selected={selectedCourseIndex === c.courseId}
      onClick={() => handleListItemClick(c.courseId)}
    >
      <ListItemText
        primary={(MaAI_COURSES[c.courseId]?.courseName ?? c.courseId) + ` (${c.member})`}
      />
    </ListItemButton>
  ));

  return (
    <Box display="flex" flexWrap="wrap" gap="2px">
      {isLoading ? (
        <CircularProgress />
      ) : (
        <>
          <Box sx={{ maxHeight: '400px', overflow: 'auto', flex: '240px 1 1' }}>
            <List>{courseList}</List>
          </Box>
          {selectedCourseIndex === null ? null : (
            <Box flex="400px 1 1">
              <StudyBuddyConnectionsGraph
                connections={connections}
                userIdsAndActiveStatus={userIdsAndActiveStatus}
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

function StatsForModerator() {
  const [overviewData, setOverviewData] = useState<AllCoursesStats>();
  const [semester, setSemester] = useState('SS25');
  const { studyBuddy: t } = getLocaleObject(useRouter());

  const handleChange = (event: SelectChangeEvent) => {
    setSemester(event.target.value);
  };
  useEffect(() => {
    const fetchData = async () => {
      getAllUsersStats(semester).then(setOverviewData);
    };
    fetchData();
  }, [semester]);
  return (
    <>
      <Typography variant="h4">{t.insightHeading}</Typography>
      <Box display="flex" flexDirection="column" alignItems="center">
        <Card sx={{ mt: '20px', mb: '20px', width: '80%' }}>
          <CardContent>
            <Box display="flex" width="100%" justifyContent="flex-start" mb={2}>
              <FormControl fullWidth>
                <InputLabel id="semester-select-label">Select Semester</InputLabel>
                <Select
                  labelId="semester-select-label"
                  id="semester-select"
                  value={semester}
                  label="Select Semester"
                  onChange={handleChange}
                >
                  <MenuItem value="WS23-24">WS23-24</MenuItem>
                  <MenuItem value="SS24">SS24</MenuItem>
                  <MenuItem value="WS24-25">WS24-25</MenuItem>
                  <MenuItem value="SS25">SS25</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <StudyBuddyModeratorOverview overviewData={overviewData} />
            <hr />
            <StudyBuddyOverviewGraph instanceId={semester} />
          </CardContent>
        </Card>
      </Box>
    </>
  );
}

function CourseStub({ courseCode, onCancel }: { courseCode: string; onCancel?: () => void }) {
  const router = useRouter();
  const { studyBuddy: t } = getLocaleObject(router);
  return (
    <Button
      sx={{ display: 'flex', alignItems: 'center' }}
      variant="contained"
      onClick={() => router.push(`/study-buddy/${courseCode}`)}
    >
      {MaAI_COURSES[courseCode]?.courseName ?? courseCode}
      {onCancel && (
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          size="small"
        >
          <Tooltip title={t.removeFromRecents}>
            <CloseIcon htmlColor="white" />
          </Tooltip>
        </IconButton>
      )}
    </Button>
  );
}

function EnrolledCourses({ courseIds }) {
  const { studyBuddy: t } = getLocaleObject(useRouter());
  return (
    <>
      <Typography variant="h5" textAlign="left" color="primary">
        {t.myEnrolledCourses}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          mt: '10px',
        }}
      >
        {courseIds.map((courseId: string) => (
          <CourseStub key={courseId} courseCode={courseId} />
        ))}
      </Box>
    </>
  );
}
function ChosenStudyBuddyCourses() {
  const chosenCourses = getRecentCourses();
  const { studyBuddy: t } = getLocaleObject(useRouter());
  const [, forceRerender] = useReducer((x) => x + 1, 0);

  if (!chosenCourses?.length) return <></>;
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        alignItems: 'center',
        mt: '10px',
      }}
    >
      <Box>{t.recent}:&nbsp;</Box>
      {chosenCourses.map((courseCode) => (
        <CourseStub
          key={courseCode}
          courseCode={courseCode}
          onCancel={() => {
            removeRecentCourse(courseCode);
            forceRerender();
          }}
        />
      ))}
    </Box>
  );
}

const Courses: NextPage = () => {
  const router = useRouter();
  const courseList = MaAI_COURSES;
  const { studyBuddy: t } = getLocaleObject(useRouter());
  const [, forceRerender] = useReducer((x) => x + 1, 0);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [userInfo, setUserInfo] = useState<UserInfo | undefined>(null);
  const [isUserAModerator, setIsUserAModerator] = useState(false);

  useEffect(() => {
    getEnrolledCourseIds().then(setEnrolledCourseIds);
    getUserInfo().then(setUserInfo);
    canModerateStudyBuddy().then(setIsUserAModerator);
  }, []);
  const courseIds = enrolledCourseIds.map((item) => item?.courseId);
  return (
    <MainLayout title="Study Buddy | ALeA">
      <Box
        sx={{
          margin: 'auto',
          textAlign: 'center',
          maxWidth: '800px',
          m: '0 auto',
          p: '0 10px',
        }}
      >
        {isUserAModerator ? <StatsForModerator /> : null}
        <Typography
          variant="h3"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="primary"
        >
          Study Buddy <Diversity3 sx={{ ml: '5px' }} fontSize="inherit" />
        </Typography>
        <Typography variant="body1">{t.findCourse}</Typography>
        <Typography sx={{ textAlign: 'left', mt: '10px', mb: '10px' }}>
          {t.studyBuddyIntro}
        </Typography>
        <hr />
        {courseIds.length ? (
          <EnrolledCourses courseIds={courseIds} />
        ) : (
          <Typography sx={{ textAlign: 'left', mt: '10px', mb: '5px' }}>
            {t.notEnrolledMessage}
          </Typography>
        )}
        <br />
        <Autocomplete
          id="combo-box-demo"
          options={Object.keys(courseList).map((courseCode) => ({
            label: courseList[courseCode]?.courseName,
            id: courseCode,
          }))}
          sx={{ width: 300 }}
          renderInput={(params) => {
            return <TextField {...params} label="Course" />;
          }}
          onChange={async (e, v) => {
            const courseCode = v?.id;
            if (courseCode) {
              addRecentCourse(courseCode);
              forceRerender();
              await new Promise((r) => setTimeout(r, 500));
              router.push(`/study-buddy/${courseCode}`);
            }
          }}
        />
        <ChosenStudyBuddyCourses />
        <TableContainer component={Paper} sx={{ mt: '20px' }}>
          <Table sx={{ textAlign: 'center', maxWidth: '800px' }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: PRIMARY_COL }}>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>{t.allCourses}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.keys(courseList).map((courseCode) => (
                <TableRow key={courseCode}>
                  <TableCell>
                    <Link
                      href={`/study-buddy/${courseCode}`}
                      onClick={() => addRecentCourse(courseCode)}
                    >
                      {courseList[courseCode]?.courseName}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </MainLayout>
  );
};

export default Courses;
