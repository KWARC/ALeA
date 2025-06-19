import { FTML } from '@kwarc/ftml-viewer';
import { Rule, Visibility } from '@mui/icons-material';
import ArticleIcon from '@mui/icons-material/Article';
import CommentIcon from '@mui/icons-material/Comment';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import GradingIcon from '@mui/icons-material/Grading';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import QuizIcon from '@mui/icons-material/Quiz';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  IconButton,
  Typography,
} from '@mui/material';
import {
  CommentType,
  getCoverageTimeline,
  getCourseGradingItems,
  getCourseIdsForEnrolledUser,
  getCourseInfo,
  getCourseInstanceThreads,
  getCourseQuizList,
  getDocumentSections,
  getHomeworkList,
  getUserInfo,
  QuestionStatus,
  QuizStubInfo,
  UserInfo,
} from '@stex-react/api';
import {
  Action,
  CourseInfo,
  CourseResourceAction,
  CURRENT_TERM,
  isFauId,
  LectureEntry,
  PRIMARY_COL,
  ResourceName,
} from '@stex-react/utils';
import dayjs from 'dayjs';
import Link from 'next/link';
import { NextRouter, useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { getLocaleObject } from '../lang/utils';
import MainLayout from '../layouts/MainLayout';
import { BannerSection, CourseCard, VollKiInfoSection } from '../pages';
import { CourseThumb } from '../pages/u/[institution]';
import { SecInfo } from '../types';
import { getSecInfo } from './coverage-update';
import { calculateLectureProgress } from './CoverageTable';

interface ColorInfo {
  color: string;
  type: 'updates_pending' | 'progress' | 'default';
  value?: number;
  max?: number;
}

interface ResourceDisplayInfo {
  description: string | null;
  timeAgo: string | null;
  timestamp: string | null;
  quizId?: string | null;
  colorInfo?: ColorInfo;
}

const EXCLUDED_RESOURCES = [ResourceName.COURSE_STUDY_BUDDY, ResourceName.COURSE_ACCESS];

const getResourceDisplayText = (name: ResourceName, router: NextRouter) => {
  const { resource: r } = getLocaleObject(router);
  if (name === ResourceName.COURSE_COMMENTS) {
    return r.forum;
  }
  if (name === ResourceName.COURSE_QUIZ) {
    return r.quiz;
  }
  if (name === ResourceName.COURSE_HOMEWORK) {
    return r.homework;
  }
  if (name === ResourceName.COURSE_NOTES) {
    return r.updatesyllabus;
  }
  return name.replace('COURSE_', ' ').replace('_', ' ');
};

function calculateTimeAgo(timestamp: string): string | null {
  if (!timestamp) return null;
  const dateTime = dayjs(parseInt(timestamp));
  return dateTime.isValid() ? dateTime.fromNow() : null;
}

const getColoredDescription = (text: string, colorInfo?: ColorInfo) => {
  if (!colorInfo) {
    return <span style={{ color: 'text.secondary' }}>{text}</span>;
  }
  return <span style={{ color: colorInfo.color }}>{text}</span>;
};

const getResourceIcon = (name: ResourceName) => {
  switch (name) {
    case ResourceName.COURSE_NOTES:
      return <ArticleIcon sx={{ fontSize: '15px' }} />;
    case ResourceName.COURSE_QUIZ:
      return <QuizIcon sx={{ fontSize: '15px' }} />;
    case ResourceName.COURSE_COMMENTS:
      return <CommentIcon sx={{ fontSize: '15px' }} />;
    case ResourceName.COURSE_STUDY_BUDDY:
      return <Diversity3Icon sx={{ fontSize: '15px' }} />;
    case ResourceName.COURSE_HOMEWORK:
      return <GradingIcon sx={{ fontSize: '15px' }} />;
    case ResourceName.COURSE_ACCESS:
      return <LockOpenIcon sx={{ fontSize: '15px' }} />;
    default:
      return name[0];
  }
};

async function getCommentsInfo(courseId: string, router: NextRouter) {
  const { resource: r } = getLocaleObject(router);
  const comments = await getCourseInstanceThreads(courseId, CURRENT_TERM);
  const questions = comments.filter((comment) => comment.commentType === CommentType.QUESTION);
  const unanswered = questions.filter(
    (comment) => comment.questionStatus === QuestionStatus.UNANSWERED
  ).length;
  const percentage =
    questions.length > 0 ? ((questions.length - unanswered) / questions.length) * 100 : 0;
  let color = 'inherit';
  if (questions.length === 0 && unanswered === 0) {
    color = 'text.secondary';
  } else if (percentage < 30) {
    color = 'red';
  } else if (percentage < 70) {
    color = 'orange';
  } else {
    color = 'green';
  }
  return {
    description: `${r.unansweredQuestions} - ${unanswered}/${questions.length}  `,
    timeAgo: null,
    timestamp: null,
    colorInfo: {
      color,
      type: 'progress' as const,
      value: unanswered,
      max: questions.length,
    },
  };
}

async function getLastUpdatedQuiz(
  courseId: string,
  router: NextRouter
): Promise<ResourceDisplayInfo> {
  const { resource: r } = getLocaleObject(router);

  let quizList: QuizStubInfo[] | undefined = undefined;
  let courseQuizData: LectureEntry[] = [];
  try {
    quizList = await getCourseQuizList(courseId);
    const coverageQuizData = await getCoverageTimeline();
    courseQuizData = coverageQuizData[courseId];
  } catch (error) {
    console.error('Error fetching course data:', error);
    return { description: null, timeAgo: null, timestamp: null };
  }

  const latestQuiz = quizList.reduce((acc, curr) => {
    return acc.quizStartTs > curr.quizStartTs ? acc : curr;
  }, quizList[0]);
  const firstFutureQuiz = quizList
    .filter((quiz) => quiz.quizStartTs > Date.now())
    .sort((a, b) => a.quizStartTs - b.quizStartTs)[0];
  const toShowQuiz = firstFutureQuiz || latestQuiz;
  const toShowQuizTs = toShowQuiz.quizStartTs;

  const now = Date.now();
  const nextScheduledQuiz = courseQuizData
    ?.filter((entry) => entry.isQuizScheduled && entry.timestamp_ms > now)
    .sort((a, b) => a.timestamp_ms - b.timestamp_ms)[0];
  if (toShowQuizTs > now - 12 * 60 * 60 * 1000 || !nextScheduledQuiz) {
    return {
      description: `${r.latestQuiz}: ${dayjs(toShowQuizTs).format('YYYY-MM-DD')}`,
      timeAgo: calculateTimeAgo(toShowQuizTs.toString()),
      timestamp: toShowQuizTs.toString(),
      quizId: toShowQuiz.quizId,
      colorInfo: {
        color: 'gray',
        type: 'default' as const,
      },
    };
  }

  const nextScheduledQuizTs = nextScheduledQuiz.timestamp_ms;
  // In this case, the instructor has to perform an action (create a quiz). To highlight it, we use orange color.
  return {
    description: `${r.prepareUpcomingQuiz}: ${dayjs(nextScheduledQuizTs).format('YYYY-MM-DD')}`,
    timeAgo: calculateTimeAgo(nextScheduledQuizTs.toString()),
    timestamp: nextScheduledQuizTs.toString(),
    quizId: null,
    colorInfo: {
      color: 'red',
      type: 'updates_pending' as const,
    },
  };
}

async function getLastUpdatedHomework(
  courseId: string,
  router: NextRouter
): Promise<ResourceDisplayInfo> {
  const { resource: r } = getLocaleObject(router);

  try {
    const homeworkList = await getHomeworkList(courseId);
    if (homeworkList.length === 0) {
      return {
        description: r.noHomeworkAvailable || 'No homework available',
        timeAgo: null,
        timestamp: null,
        colorInfo: {
          color: 'text.secondary',
          type: 'default' as const,
        },
      };
    }
    const timestamp = homeworkList.reduce((acc, curr) => {
      return acc > dayjs(curr.givenTs).valueOf() ? acc : dayjs(curr.givenTs).valueOf();
    }, dayjs(homeworkList[0].givenTs).valueOf());
    const description = `${r.latestHomework}: ${dayjs(timestamp).format('YYYY-MM-DD')}`;
    const timeAgo = calculateTimeAgo(timestamp.toString());
    return {
      description,
      timeAgo,
      timestamp: timestamp.toString(),
      colorInfo: {
        color: 'text.secondary',
        type: 'default' as const,
      },
    };
  } catch (error) {
    console.error('Error fetching course data:', error);
    return { description: null, timeAgo: null, timestamp: null };
  }
}

export async function getLastUpdatedNotes(
  courseId: string,
  router: NextRouter
): Promise<ResourceDisplayInfo> {
  const { resource: r } = getLocaleObject(router);
  try {
    const coverageData = await getCoverageTimeline();
    const courseData = coverageData[courseId] ?? [];
    const targetUsed = courseData.some((entry) => entry.targetSectionUri);

    let progressStatus: string | null = null;

    if (targetUsed) {
      const allCourses = await getCourseInfo();
      const notesUri = allCourses[courseId]?.notes;

      if (notesUri) {
        const tocResp = await getDocumentSections(notesUri);
        const docSections = tocResp[1];
        const sections = docSections.flatMap((d) => getSecInfo(d));
        const secInfo = sections.reduce((acc, s) => {
          acc[s.uri] = { id: s.uri, title: s.title, uri: s.uri };
          return acc;
        }, {} as Record<FTML.DocumentURI, SecInfo>);

        progressStatus = calculateLectureProgress(courseData, secInfo);
      }
    }

    if (!courseData || courseData.length === 0) {
      return {
        description: r.noUpdatesAvailable || 'No updates available',
        timeAgo: null,
        timestamp: null,
        colorInfo: {
          color: 'text.secondary',
          type: 'default',
        },
      };
    }

    const entriesWithSection = courseData.filter(
      (entry) => entry.sectionUri && entry.sectionUri.trim() !== ''
    );

    const latestValidUpdate = entriesWithSection.reduce(
      (latest, current) =>
        dayjs(current.timestamp_ms).isAfter(dayjs(latest.timestamp_ms)) ? current : latest,
      entriesWithSection[0]
    );

    const lastUpdatedTimestamp = latestValidUpdate?.timestamp_ms ?? null;

    const pendingUpdates = courseData.filter(
      (entry) => !entry.sectionUri && entry.timestamp_ms < Date.now()
    ).length;

    if (lastUpdatedTimestamp) {
      const formattedDate = dayjs(lastUpdatedTimestamp).format('YYYY-MM-DD');

      const descriptionLines = [
        `${r.lastUpdated}: ${formattedDate}`,
        ...(pendingUpdates > 0 ? [`${pendingUpdates} ${r.updates} ${r.pending}`] : []),
        ...(progressStatus ? [`${r.progress}: ${progressStatus}`] : []),
      ];

      return {
        description: descriptionLines.join('\n'),
        timeAgo: null,
        timestamp: lastUpdatedTimestamp.toString(),
        colorInfo: {
          color: pendingUpdates > 0 ? 'red' : 'text.secondary',
          type: pendingUpdates > 0 ? 'updates_pending' : 'default',
        },
      };
    }
    const progressString = progressStatus ? `\n${r.progress}: ${progressStatus}` : '';

    if (pendingUpdates > 0) {
      return {
        description: `${pendingUpdates} ${r.updates} ${r.pending}${progressString}`,
        timeAgo: null,
        timestamp: null,
        colorInfo: {
          color: 'red',
          type: 'updates_pending',
        },
      };
    }

    return {
      description: r.noUpdatesAvailable || 'No updates available',
      timeAgo: null,
      timestamp: null,
      colorInfo: {
        color: 'text.secondary',
        type: 'default',
      },
    };
  } catch (error) {
    console.error('Error fetching course data:', error);
    return {
      description: r.failedToLoadUpdates || 'Failed to load updates',
      timeAgo: null,
      timestamp: null,
      colorInfo: {
        color: 'text.secondary',
        type: 'default',
      },
    };
  }
}

async function getUngradedProblems(
  courseId: string,
  router: NextRouter
): Promise<ResourceDisplayInfo> {
  const { resource: r } = getLocaleObject(router);

  try {
    const response = (await getCourseGradingItems(courseId)).gradingItems;
    const ungradedProblems = response.filter(
      (problem) => problem.numSubProblemsGraded !== problem.numSubProblemsAnswered
    );

    const percentage =
      response.length > 0
        ? ((response.length - ungradedProblems.length) / response.length) * 100
        : 0;
    let color = 'inherit';

    if (response.length === 0 && ungradedProblems.length === 0) {
      color = 'text.secondary';
    } else if (percentage < 30) {
      color = 'red';
    } else if (percentage < 70) {
      color = 'orange';
    } else {
      color = 'green';
    }

    const description = `${r.ungradedProblems} - ${ungradedProblems.length}/${response.length}`;
    return {
      description,
      timeAgo: null,
      timestamp: null,
      colorInfo: {
        color,
        type: 'progress' as const,
        value: ungradedProblems.length,
        max: response.length,
      },
    };
  } catch (error) {
    console.error('Error fetching course data:', error);
    return { description: null, timeAgo: null, timestamp: null };
  }
}

async function getLastUpdatedDescriptions({
  courseId,
  name,
  action,
  router,
}: {
  courseId: string;
  name: ResourceName;
  action: Action;
  router: NextRouter;
}): Promise<ResourceDisplayInfo> {
  let description = null;
  let timeAgo = null;
  let timestamp = null;
  let quizId = null;
  let colorInfo = undefined;

  switch (name) {
    case ResourceName.COURSE_NOTES:
      ({ description, timeAgo, timestamp, colorInfo } = await getLastUpdatedNotes(
        courseId,
        router
      ));
      break;
    case ResourceName.COURSE_HOMEWORK:
      if (action === Action.MUTATE) {
        ({ description, timeAgo, timestamp, colorInfo } = await getLastUpdatedHomework(
          courseId,
          router
        ));
      } else if (action === Action.INSTRUCTOR_GRADING) {
        ({ description, timeAgo, timestamp, colorInfo } = await getUngradedProblems(
          courseId,
          router
        ));
      }
      break;
    case ResourceName.COURSE_QUIZ:
      ({ description, timeAgo, timestamp, quizId, colorInfo } = await getLastUpdatedQuiz(
        courseId,
        router
      ));
      if (quizId) {
        description = `Latest Quiz: ${dayjs(parseInt(timestamp)).format('YYYY-MM-DD HH:mm:ss')}`;
      }
      break;
    case ResourceName.COURSE_COMMENTS:
      ({ description, timeAgo, timestamp, colorInfo } = await getCommentsInfo(courseId, router));
      break;
    default:
      break;
  }

  return { description, timeAgo, timestamp, quizId, colorInfo };
}

const groupByCourseId = (resources: CourseResourceAction[]) => {
  resources = resources.filter((resource) => !EXCLUDED_RESOURCES.includes(resource.name));
  return resources.reduce((acc, resource) => {
    const { courseId } = resource;
    if (!acc[courseId]) {
      acc[courseId] = [];
    }
    acc[courseId].push(resource);
    return acc;
  }, {} as Record<string, CourseResourceAction[]>);
};

const handleResourceClick = (
  router: any,
  resource: CourseResourceAction,
  action?: Action,
  quizId?: string
) => {
  const actionsToDisplay: Action[] = [
    Action.PREVIEW,
    Action.MODERATE,
    Action.INSTRUCTOR_GRADING,
    Action.MUTATE,
  ];

  if (action && !actionsToDisplay.includes(action)) return;

  const { courseId, name } = resource;
  let url = '';
  if (name === ResourceName.COURSE_NOTES) {
    url = `instructor-dash/${courseId}?tab=syllabus`;
  } else if (name === ResourceName.COURSE_HOMEWORK) {
    if (action === Action.INSTRUCTOR_GRADING) {
      url = `instructor-dash/${courseId}?tab=homework-grading`;
    } else {
      url = `instructor-dash/${courseId}?tab=homework-manager`;
    }
  } else if (name === ResourceName.COURSE_QUIZ) {
    if (action === Action.PREVIEW && quizId) {
      url = `quiz/${quizId}`;
    } else {
      url = `instructor-dash/${courseId}?tab=quiz-dashboard`;
    }
  } else if (name === ResourceName.COURSE_COMMENTS) {
    url = `forum/${courseId}`;
  }
  if (url) {
    router.push(url);
  } else {
    console.warn('No matching URL for this resource or action');
  }
};

function MyCourses({ enrolledCourseIds }) {
  const [allCourses, setAllCourses] = useState<Record<string, CourseInfo>>({});
  useEffect(() => {
    getCourseInfo().then(setAllCourses);
  }, []);
  return (
    <>
      <Typography
        sx={{
          fontSize: '22px',
          fontWeight: 'bold',
          padding: '10px',
          textAlign: 'center',
        }}
      >
        My Courses
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'Wrap' }}>
        {enrolledCourseIds
          .filter((courseId: string) => allCourses[courseId])
          .map((courseId: string) => (
            <CourseThumb key={courseId} course={allCourses[courseId]} />
          ))}
      </Box>
    </>
  );
}

function ResourceCard({
  resource,
  descriptions,
  courseId,
}: {
  resource: CourseResourceAction;
  descriptions: Record<string, ResourceDisplayInfo>;
  courseId: string;
}) {
  const router = useRouter();
  const isQuiz = resource.name === 'COURSE_QUIZ';
  const isHomework = resource.name === 'COURSE_HOMEWORK';
  const actionsToDisplay: Action[] = [
    Action.PREVIEW,
    Action.MODERATE,
    Action.INSTRUCTOR_GRADING,
    Action.MUTATE,
  ];
  const commonActions = actionsToDisplay.filter((action) => resource.actions.includes(action));

  const resourceDescriptions = Object.entries(descriptions)
    .filter(([key]) => {
      return commonActions.some((action) =>
        key.startsWith(`${courseId}-${resource.name}-${action}`)
      );
    })
    .reduce(
      (acc, [, value]) => {
        acc.description = [...new Set([...acc.description, value.description])];
        acc.timeAgo = [...new Set([...acc.timeAgo, value.timeAgo])];
        acc.timestamp = [...new Set([...acc.timestamp, value.timestamp])];
        acc.quizId = [...new Set([...acc.quizId, value.quizId])];
        acc.colorInfo = [...acc.colorInfo, value.colorInfo].filter(Boolean);
        return acc;
      },
      { description: [], timeAgo: [], timestamp: [], quizId: [], colorInfo: [] }
    );

  return (
    <Card
      key={resource.name}
      sx={{
        flex: '1 1 calc(25% - 16px)',
        border: '1px solid lightgray',
        boxShadow: '0px 4px 6px gray',
        borderRadius: '8px',
        minHeight: '122px',
        minWidth: '250px',
        maxWidth: '400px',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: '0px 8px 12px gray',
        },
      }}
    >
      <CardActionArea onClick={() => handleResourceClick(router, resource)}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', padding: '8px !important' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box display="flex" sx={{ alignItems: 'center' }}>
              <Avatar
                sx={{
                  marginRight: 1,
                  bgcolor: 'primary.main',
                  width: 25,
                  height: 25,
                }}
              >
                <Box>{getResourceIcon(resource.name)}</Box>
              </Avatar>
              <Typography sx={{ fontSize: '22px', fontWeight: 'medium' }}>
                {getResourceDisplayText(resource.name, router)}
              </Typography>
            </Box>
            <Box>
              <Box sx={{ m: '10px 0 0 4px' }}>
                {resourceDescriptions.description
                  .filter((d) => d !== null)
                  .map((d, index) => (
                    <Typography key={index} sx={{ fontSize: '14px', whiteSpace: 'pre-line' }}>
                      {getColoredDescription(d, resourceDescriptions.colorInfo[index])}
                    </Typography>
                  ))}
              </Box>

              {resourceDescriptions.timeAgo && (
                <Typography
                  sx={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: resourceDescriptions.colorInfo[0]?.color,
                    ml: '4px',
                  }}
                >
                  {resourceDescriptions.timeAgo.filter((t) => t !== null).join('\n')}
                </Typography>
              )}
            </Box>
          </Box>
          {isQuiz && resourceDescriptions?.quizId.some((id) => id) && (
            <IconButton
              sx={{ color: 'primary.main', mt: 3 }}
              onClick={(event) => {
                event.stopPropagation();
                handleResourceClick(
                  router,
                  resource,
                  Action.PREVIEW,
                  resourceDescriptions.quizId[0]
                );
              }}
              aria-label="Preview quiz"
            >
              <Visibility />
            </IconButton>
          )}
          {isHomework && (
            <IconButton
              sx={{ mt: 5, color: 'primary.main' }}
              onClick={(event) => {
                event.stopPropagation();
                handleResourceClick(router, resource, Action.INSTRUCTOR_GRADING);
              }}
              aria-label="Ungraded problems"
            >
              <Rule />
            </IconButton>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function WelcomeScreen({
  resourcesForInstructor,
  filteredCourses,
}: {
  resourcesForInstructor: CourseResourceAction[];
  filteredCourses: CourseInfo[];
}) {
  const [userInfo, setUserInfo] = useState<UserInfo>(null);
  const [descriptions, setDescriptions] = useState<Record<string, ResourceDisplayInfo>>({});
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const router = useRouter();
  const {
    resource: r,
    home: { newHome: n },
  } = getLocaleObject(router);
  const groupedResources = useMemo(
    () => groupByCourseId(resourcesForInstructor),
    [resourcesForInstructor]
  );
  useEffect(() => {
    getUserInfo().then((user) => setUserInfo(user));
  }, []);

  useEffect(() => {
    getCourseIdsForEnrolledUser().then((c) => setEnrolledCourseIds(c.enrolledCourseIds));
  }, []);

  const isFAUId = isFauId(userInfo?.userId);

  useEffect(() => {
    const fetchDescriptions = async () => {
      const fetchPromises: Promise<void>[] = [];
      const newDescriptions: Record<string, ResourceDisplayInfo> = {};
      for (const courseId of Object.keys(groupedResources)) {
        for (const resource of groupedResources[courseId]) {
          for (const action of resource.actions) {
            const promise = getLastUpdatedDescriptions({
              courseId,
              name: resource.name,
              action: action,
              router,
            }).then(({ description, timeAgo, timestamp, quizId, colorInfo }) => {
              newDescriptions[`${courseId}-${resource.name}-${action}`] = {
                description,
                timeAgo,
                timestamp,
                quizId,
                colorInfo,
              };
            });
            fetchPromises.push(promise);
          }
        }
      }

      await Promise.all(fetchPromises);
      setDescriptions(newDescriptions);
    };

    fetchDescriptions();
  }, [groupedResources, router]);

  return (
    <MainLayout title="Instructor Dashboard | ALeA">
      <BannerSection tight={true} />
      <Box sx={{ px: 4, pt: 4, pb: 8, bgcolor: '#F5F5F5' }}>
        <Typography
          sx={{ fontSize: '28px', fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}
        >
          {r.welcome}, {userInfo?.fullName}
        </Typography>
        {isFAUId && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 2 }}>
            <Link href="/study-buddy" style={{ textDecoration: 'none' }}>
              <Button variant="contained">{r.studyBuddy}</Button>
            </Link>
          </Box>
        )}
        {enrolledCourseIds.length > 0 && <MyCourses enrolledCourseIds={enrolledCourseIds} />}
        {Object.entries(groupedResources).map(([courseId, resources]) => (
          <Box key={courseId} sx={{ marginBottom: 4 }}>
            <Link href={`/course-home/${courseId}`}>
              <Typography
                sx={{
                  fontSize: '22px',
                  fontWeight: 'bold',
                  marginBottom: 2,
                  backgroundColor: PRIMARY_COL,
                  color: 'white',
                  padding: '10px',
                  textAlign: 'center',
                  '&:hover': {
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    backgroundColor: 'secondary.main',
                    color: PRIMARY_COL,
                  },
                }}
              >
                {courseId.toUpperCase()}
              </Typography>
            </Link>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              {resources.map((resource, index) => (
                <ResourceCard
                  resource={resource}
                  key={index}
                  descriptions={descriptions}
                  courseId={courseId}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
      <Box
        id="courses"
        sx={{
          display: 'flex',
          justifyContent: 'space-around',
          marginTop: '40px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {filteredCourses.map((course) => (
          <CourseCard key={course.courseId} course={course} />
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
        <Link href="/course-list">
          <Button variant="contained">{n.exploreOurCourse}</Button>
        </Link>
      </Box>
      <VollKiInfoSection bgcolor="white" />
    </MainLayout>
  );
}

export default WelcomeScreen;
