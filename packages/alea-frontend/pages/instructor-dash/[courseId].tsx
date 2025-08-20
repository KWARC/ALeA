import { Box, CircularProgress, Tab, Tabs } from '@mui/material';
import { canAccessResource, getCourseInfo } from '@stex-react/api';
import { updateRouterQuery } from '@stex-react/react-utils';
import { Action, CourseInfo, CURRENT_TERM, ResourceName } from '@stex-react/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import CourseAccessControlDashboard from '../../components/CourseAccessControlDashboard';
import CoverageUpdateTab from '../../components/coverage-update';
import HomeworkManager from '../../components/HomeworkManager';
import { GradingInterface } from '../../components/nap/GradingInterface';
import InstructorPeerReviewViewing from '../../components/peer-review/InstructorPeerReviewViewing';
import QuizDashboard from '../../components/QuizDashboard';
import { StudyBuddyModeratorStats } from '../../components/StudyBuddyModeratorStats';
import MainLayout from '../../layouts/MainLayout';
import { CourseHeader } from '../course-home/[courseId]';
import CourseMetadata from '../../components/instructor-panel/CourseMetadata';
interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

type TabName =
  | 'access-control'
  | 'homework-manager'
  | 'homework-grading'
  | 'quiz-dashboard'
  | 'study-buddy'
  | 'peer-review'
  | 'syllabus'
  | 'course-metadata';

const TAB_ACCESS_REQUIREMENTS: Record<TabName, { resource: ResourceName; actions: Action[] }> = {
  'access-control': { resource: ResourceName.COURSE_ACCESS, actions: [Action.ACCESS_CONTROL] },
  'homework-manager': { resource: ResourceName.COURSE_HOMEWORK, actions: [Action.MUTATE] },
  'homework-grading': {
    resource: ResourceName.COURSE_HOMEWORK,
    actions: [Action.INSTRUCTOR_GRADING],
  },
  'quiz-dashboard': {
    resource: ResourceName.COURSE_QUIZ,
    actions: [Action.MUTATE, Action.PREVIEW],
  },
  'peer-review': { resource: ResourceName.COURSE_PEERREVIEW, actions: [Action.MUTATE] },
  'study-buddy': { resource: ResourceName.COURSE_STUDY_BUDDY, actions: [Action.MODERATE] },
  syllabus: { resource: ResourceName.COURSE_SYLLABUS, actions: [Action.MUTATE] },
  'course-metadata': { resource: ResourceName.COURSE_ACCESS, actions: [Action.ACCESS_CONTROL] },
};
function ChosenTab({
  tabName,
  courseId,
  instanceId,
  quizId,
  onQuizIdChange,
}: {
  tabName: TabName;
  courseId: string;
  instanceId: string;
  quizId?: string;
  onQuizIdChange?: (id: string) => void;
}) {
  switch (tabName) {
    case 'access-control':
      return <CourseAccessControlDashboard courseId={courseId} />;
    case 'homework-manager':
      return <HomeworkManager courseId={courseId} />;
    case 'homework-grading':
      return <GradingInterface isPeerGrading={false} courseId={courseId} />;
    case 'quiz-dashboard':
      return <QuizDashboard courseId={courseId} quizId={quizId} onQuizIdChange={onQuizIdChange} />;
    case 'study-buddy':
      return <StudyBuddyModeratorStats courseId={courseId} />;
    case 'peer-review':
      return <InstructorPeerReviewViewing courseId={courseId}></InstructorPeerReviewViewing>;
    case 'syllabus':
      return <CoverageUpdateTab />;
    case 'course-metadata':
      return <CourseMetadata courseId={courseId} instanceId={instanceId} />;
    default:
      return null;
  }
}

const toUserFriendlyName = (tabName: string) => {
  return tabName
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (str) => str.toUpperCase());
};

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      sx={{ padding: '20px' }}
    >
      {value === index && <Box>{children}</Box>}
    </Box>
  );
};

const TAB_MAX_WIDTH: Record<TabName, string | undefined> = {
  'access-control': '900px',
  'homework-grading': undefined,
  'peer-review': undefined,
  'homework-manager': '900px',
  'quiz-dashboard': '900px',
  'study-buddy': '900px',
  syllabus: '1200px',
  'course-metadata': '1200px',
};

const InstructorDash: NextPage = () => {
  const router = useRouter();
  const courseId = router.query.courseId as string;
  const instanceId = (router.query.instanceId as string) ?? CURRENT_TERM;
  const tab = router.query.tab as TabName;

  const [courses, setCourses] = useState<Record<string, CourseInfo> | undefined>(undefined);

  const [accessibleTabs, setAccessibleTabs] = useState<TabName[] | undefined>(undefined);
  const [currentTabIdx, setCurrentTabIdx] = useState<number>(0);

  const [quizId, setQuizId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (router.isReady) {
      setQuizId(router.query.quizId as string);
    }
  }, [router.isReady, router.query.quizId]);

  const handleQuizIdChange = (newQuizId: string) => {
    if (quizId === newQuizId) return;
    setQuizId(newQuizId);
    updateRouterQuery(router, { quizId: newQuizId }, true);
  };

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTabIdx(newValue);
    const selectedTab = accessibleTabs[newValue];
    const newQuery = { ...router.query, tab: selectedTab } as Record<string, string>;
    if (selectedTab !== 'quiz-dashboard') {
      delete newQuery.quizId;
    }
    updateRouterQuery(router, newQuery, false);
  };
  useEffect(() => {
    getCourseInfo().then(setCourses);
  }, []);

  useEffect(() => {
    if (!courseId) return;
    async function checkTabAccess() {
      const tabAccessPromises$ = Object.entries(TAB_ACCESS_REQUIREMENTS).map(
        async ([tabName, { resource, actions }]) => {
          for (const action of actions) {
            if (await canAccessResource(resource, action, { courseId, instanceId: CURRENT_TERM })) {
              return tabName as TabName;
            }
          }
          return undefined;
        }
      );
      const tabs = (await Promise.all(tabAccessPromises$)).filter((t): t is TabName => !!t);

      const tabOrder: TabName[] = [
        'syllabus',
        'quiz-dashboard',
        'homework-manager',
        'homework-grading',
        'study-buddy',
        'peer-review',
        'access-control',
        'course-metadata',
      ];

      const sortedTabs = tabOrder.filter((tab) => tabs.includes(tab));
      setAccessibleTabs(sortedTabs);
    }
    checkTabAccess();
  }, [courseId]);

  useEffect(() => {
    if (accessibleTabs === undefined) return;
    if (tab && accessibleTabs.includes(tab)) {
      setCurrentTabIdx(accessibleTabs.indexOf(tab));
    } else {
      setCurrentTabIdx(0);
      updateRouterQuery(router, { tab: accessibleTabs[0] }, true);
    }
  }, [accessibleTabs, tab, router]);

  useEffect(() => {
    if (tab !== 'quiz-dashboard' && router.query.quizId) {
      updateRouterQuery(router, { quizId: undefined }, true);
    }
  }, [tab, router]);

  const courseInfo = courses?.[courseId];
  if (!accessibleTabs) return <CircularProgress />;

  return (
    <MainLayout>
      <CourseHeader
        courseName={courseInfo?.courseName}
        imageLink={courseInfo?.imageLink}
        courseId={courseId}
      />
      <Box
        sx={{
          width: '100%',
          margin: 'auto',
          maxWidth: TAB_MAX_WIDTH[accessibleTabs[currentTabIdx]],
        }}
      >
        <Tabs
          value={currentTabIdx}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Instructor Dashboard Tabs"
          sx={{
            overflowX: 'auto',
            '& .MuiTabs-flexContainer': {
              justifyContent: {
                xs: 'flex-start',
                md: 'center',
                xs: 'flex-start',
                md: 'center',
              },
            },
            '& .MuiTab-root': {
              fontSize: '14px',
              minWidth: '120px',
              textTransform: 'none',
            },
          }}
        >
          {accessibleTabs.map((tabName, index) => (
            <Tab key={tabName} label={toUserFriendlyName(tabName)} />
          ))}
        </Tabs>
        {accessibleTabs.map((tabName, index) => (
          <TabPanel key={tabName} value={currentTabIdx} index={index}>
            <ChosenTab
              tabName={tabName}
              courseId={courseId}
              instanceId={instanceId}
              quizId={quizId}
              onQuizIdChange={handleQuizIdChange}
            />
          </TabPanel>
        ))}
      </Box>
    </MainLayout>
  );
};

export default InstructorDash;
