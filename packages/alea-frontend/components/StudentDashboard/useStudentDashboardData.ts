import type { HomeworkStub, LectureSchedule, LectureScheduleItem, QuizStubInfo } from '@alea/spec';
import {
  getCheatSheets,
  getCheatsheetUploadWindow,
  getCourseQuizList,
  getHomeworkList,
  getLectureEntry,
  getLectureSchedule,
  getSemesterInfo,
} from '@alea/spec';
import type { CourseInfo } from '@alea/utils';
import { pathToCheatSheet } from '@alea/utils';
import { useQueries, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useMemo } from 'react';
import type { CourseStudentData } from './types';
import { DEFAULT_INSTITUTION } from './types';
import { getNextOrCurrentScheduleOccurrence, normalizeLectureScheduleEntry } from './utils';

dayjs.extend(utc);

type LectureEntry = {
  lectureSchedule?: LectureSchedule[];
  tutorialSchedule?: LectureSchedule[];
  livestreamUrl?: string | null;
};

function normalizeSchedule(items: LectureSchedule[] | undefined): LectureScheduleItem[] {
  return items?.map(normalizeLectureScheduleEntry) ?? [];
}

async function fetchCourseDashboardData(
  courseId: string,
  currentTerm: string,
  courseInfo?: CourseInfo
): Promise<Omit<CourseStudentData, 'isSemesterOver'>> {
  const now = Date.now();
  const courseResult: Omit<CourseStudentData, 'isSemesterOver'> = {
    courseId,
    liveQuiz: null,
    upcomingQuiz: null,
    nextHomework: null,
    nextLectureTs: null,
    nextTutorialTs: null,
  };

  const entry: LectureEntry | null = await getLectureEntry({
    courseId,
    instanceId: currentTerm,
  }).catch(() => null);

  const [quizList, homeworkList, uploadWindowResponse, cheatSheets] = await Promise.all([
    getCourseQuizList(courseId),
    getHomeworkList(courseId),
    courseInfo?.cheatsheetConfig?.hasCheatsheet &&
    courseInfo.cheatsheetConfig?.canStudentUploadCheatsheet
      ? getCheatsheetUploadWindow(courseId, currentTerm, DEFAULT_INSTITUTION).catch(() => null)
      : Promise.resolve(null),
    courseInfo?.cheatsheetConfig?.hasCheatsheet
      ? getCheatSheets(courseId, currentTerm).catch(() => [])
      : Promise.resolve([]),
  ]);

  const quizzes = (quizList || []) as QuizStubInfo[];
  courseResult.liveQuiz = quizzes.find((q) => q.quizStartTs <= now && now < q.quizEndTs) ?? null;
  courseResult.upcomingQuiz =
    quizzes.filter((q) => q.quizStartTs > now).sort((a, b) => a.quizStartTs - b.quizStartTs)[0] ??
    null;

  const homeworks = (homeworkList || []) as HomeworkStub[];
  courseResult.nextHomework =
    homeworks
      .filter((h) => dayjs(h.dueTs).valueOf() > now)
      .sort((a, b) => dayjs(a.dueTs).valueOf() - dayjs(b.dueTs).valueOf())[0] ??
    homeworks[homeworks.length - 1] ??
    null;

  let lectureSchedule = normalizeSchedule(entry?.lectureSchedule);
  if (lectureSchedule.length === 0) {
    const schedule = await getLectureSchedule(courseId, currentTerm).catch(() => null);
    lectureSchedule = Array.isArray(schedule) ? schedule : [];
  }

  const nextLecture = getNextOrCurrentScheduleOccurrence(lectureSchedule);
  if (nextLecture) {
    courseResult.nextLectureTs = nextLecture.ts;
    courseResult.isLectureOngoing = nextLecture.isOngoing;
    courseResult.nextLectureVenue = nextLecture.venue;
    courseResult.nextLectureVenueLink = entry?.livestreamUrl || nextLecture.venueLink;
  }

  const tutorialSchedule = normalizeSchedule(entry?.tutorialSchedule);
  const nextTutorial = getNextOrCurrentScheduleOccurrence(tutorialSchedule);
  if (nextTutorial) {
    courseResult.nextTutorialTs = nextTutorial.ts;
    courseResult.isTutorialOngoing = nextTutorial.isOngoing;
    courseResult.nextTutorialVenue = nextTutorial.venue;
    courseResult.nextTutorialVenueLink = nextTutorial.venueLink;
  }

  if (
    courseInfo?.cheatsheetConfig?.hasCheatsheet &&
    courseInfo.cheatsheetConfig?.canStudentUploadCheatsheet
  ) {
    const currentWindow = uploadWindowResponse?.currentWindow;
    const sheets = (cheatSheets || []) as Array<{ weekId: string }>;

    if (currentWindow?.isWithinWindow && !currentWindow.isSkipped) {
      const currentWeekId = currentWindow.weekId;
      const hasUploadedCurrentWeek = sheets.some((sheet) => sheet.weekId === currentWeekId);

      if (!hasUploadedCurrentWeek) {
        courseResult.cheatsheetUploadPending = true;
        courseResult.cheatsheetUploadHref = pathToCheatSheet(
          DEFAULT_INSTITUTION,
          courseId,
          currentTerm
        );
        courseResult.cheatsheetUploadWindowEndTs = currentWindow.windowEnd
          ? dayjs.utc(currentWindow.windowEnd).valueOf()
          : undefined;
      }
    }
  }

  return courseResult;
}

async function getSemesterOver(currentTerm: string): Promise<boolean> {
  const now = Date.now();
  try {
    const raw = await getSemesterInfo(DEFAULT_INSTITUTION, currentTerm);
    const obj = Array.isArray(raw) ? raw[0] : raw;
    const endDate = (obj as { lectureEndDate?: string } | null)?.lectureEndDate;
    return !!endDate && now > dayjs.utc(endDate).endOf('day').valueOf();
  } catch {
    return false;
  }
}

export function useStudentDashboardData(
  enrolledCourseIds: string[],
  currentTerm: string | undefined,
  allCourses: Record<string, CourseInfo>
): { data: Record<string, CourseStudentData>; loading: boolean } {
  const semesterQuery = useQuery({
    queryKey: ['semester', DEFAULT_INSTITUTION, currentTerm],
    queryFn: () => getSemesterOver(currentTerm!),
    enabled: !!currentTerm && enrolledCourseIds.length > 0,
  });

  const courseQueries = useQueries({
    queries: enrolledCourseIds.map((courseId) => {
      const courseInfo = allCourses[courseId];
      return {
        queryKey: [
          'course-dashboard',
          courseId,
          currentTerm,
          courseInfo?.cheatsheetConfig?.hasCheatsheet,
          courseInfo?.cheatsheetConfig?.canStudentUploadCheatsheet,
        ],
        queryFn: () => fetchCourseDashboardData(courseId, currentTerm!, courseInfo),
        enabled: !!currentTerm,
      };
    }),
  });

  const data = useMemo(() => {
    const semesterOver = semesterQuery.data ?? false;
    const result: Record<string, CourseStudentData> = {};
    courseQueries.forEach((query, i) => {
      const courseId = enrolledCourseIds[i];
      if (courseId && query.data) {
        result[courseId] = { ...query.data, isSemesterOver: semesterOver };
      }
    });
    return result;
  }, [semesterQuery.data, enrolledCourseIds, courseQueries]);

  const loading = semesterQuery.isLoading || courseQueries.some((q) => q.isLoading);

  return { data, loading };
}
