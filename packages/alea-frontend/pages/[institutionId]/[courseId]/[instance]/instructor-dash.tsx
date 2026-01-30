import { Box, CircularProgress, Tab, Tabs } from '@mui/material';
import { canAccessResource, getAllCourses } from '@alea/spec';
import { updateRouterQuery } from '@alea/react-utils';
import { Action, CourseInfo, ResourceName } from '@alea/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import CourseAccessControlDashboard from '../../../../components/CourseAccessControlDashboard';
import CoverageUpdateTab from '../../../../components/coverage-update';
import HomeworkManager from '../../../../components/HomeworkManager';
import { GradingInterface } from '../../../../components/nap/GradingInterface';
import InstructorPeerReviewViewing from '../../../../components/peer-review/InstructorPeerReviewViewing';
import QuizDashboard from '../../../../components/QuizDashboard';
import { StudyBuddyModeratorStats } from '../../../../components/StudyBuddyModeratorStats';
import MainLayout from '../../../../layouts/MainLayout';
import { CourseHeader } from '../../../../components/CourseHeader';
import CourseMetadata from '../../../../components/instructor-panel/CourseMetadata';
import { useRouteValidation } from '../../../../hooks/useRouteValidation';
import { RouteErrorDisplay } from '../../../../components/RouteErrorDisplay';
import { Typography } from '@mui/material';

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
  'course-metadata': { resource: ResourceName.COURSE_METADATA, actions: [Action.MUTATE] },
};
function ChosenTab({
  tabName,
  courseId,
  institutionId,
  instanceId,
  quizId,
  onQuizIdChange,
}: {
  tabName: TabName;
  courseId: string;
  institutionId: string;
  instanceId: string;
  quizId?: string;
  onQuizIdChange?: (id: string) => void;
}) {
  switch (tabName) {
    case 'access-control':
      return <CourseAccessControlDashboard courseId={courseId} />;
    case 'homework-manager':
      return <HomeworkManager courseId={courseId} institutionId={institutionId} />;
    case 'homework-grading':
      return <GradingInterface isPeerGrading={false} courseId={courseId} />;
    case 'quiz-dashboard':
      return <QuizDashboard courseId={courseId} institutionId={institutionId} quizId={quizId} onQuizIdChange={onQuizIdChange} />;
    case 'study-buddy':
      return <StudyBuddyModeratorStats courseId={courseId} institutionId={institutionId} />;
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
  return tabName.replace(/-/g, ' ').replace(/\b\w/g, (str) => str.toUpperCase());
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
  const {
    institutionId,
    courseId,
    instance,
    resolvedInstanceId,
    courses,
    validationError,
    isValidating,
    loadingInstanceId,
  } = useRouteValidation('instructor-dash');

  const tab = router.query.tab as TabName;

  const [accessibleTabs, setAccessibleTabs] = useState<TabName[] | undefined>(undefined);
  const [currentTabIdx, setCurrentTabIdx] = useState<number>(0);

  const [quizId, setQuizId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!router.isReady) return;
    if (typeof router.query.quizId === 'string')  {
      setQuizId(router.query.quizId);
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
    getAllCourses().then(() => {});
  }, []);

  useEffect(() => {
    if (!courseId || !resolvedInstanceId) return;
    async function checkTabAccess() {
      const tabAccessPromises$ = Object.entries(TAB_ACCESS_REQUIREMENTS).map(
        async ([tabName, { resource, actions }]) => {
          for (const action of actions) {
            if (await canAccessResource(resource, action, { courseId, instanceId: resolvedInstanceId })) {
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
  }, [courseId, resolvedInstanceId]);

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

  if (isValidating || loadingInstanceId || !courses) {
    return (
      <MainLayout title="Loading... | ALeA">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (validationError) {
    return (
      <RouteErrorDisplay
        validationError={validationError}
        institutionId={institutionId}
        courseId={courseId}
        instance={instance}
      />
    );
  }

  const courseInfo = courses?.[courseId];
  if (!accessibleTabs || !courseInfo || !resolvedInstanceId) {
    return (
      <MainLayout title="Loading... | ALeA">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <CourseHeader
        courseName={courseInfo?.courseName}
        imageLink={courseInfo?.imageLink}
        courseId={courseId}
        institutionId={institutionId}
        instanceId={resolvedInstanceId}
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
              institutionId={institutionId}
              instanceId={resolvedInstanceId}
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
