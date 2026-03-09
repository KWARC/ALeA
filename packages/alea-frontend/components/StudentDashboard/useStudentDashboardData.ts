import type { HomeworkStub, LectureSchedule, LectureScheduleItem, QuizStubInfo } from '@alea/spec';
import {
  getCourseQuizList,
  getHomeworkList,
  getLectureEntry,
  getLectureSchedule,
  getSemesterInfo,
} from '@alea/spec';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useCallback, useEffect, useState } from 'react';
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

export function useStudentDashboardData(
  enrolledCourseIds: string[],
  currentTerm: string | undefined
): { data: Record<string, CourseStudentData>; loading: boolean } {
  const [data, setData] = useState<Record<string, CourseStudentData>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!enrolledCourseIds?.length || !currentTerm) {
      setData({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const now = Date.now();

    const semesterRaw = await getSemesterInfo(DEFAULT_INSTITUTION, currentTerm).catch(() => null);
    const semesterObj = Array.isArray(semesterRaw) ? semesterRaw[0] : semesterRaw;
    const semesterEndDate = (semesterObj as { lectureEndDate?: string } | null)?.lectureEndDate;
    const semesterOver =
      !!semesterEndDate && now > dayjs.utc(semesterEndDate).endOf('day').valueOf();

    const result: Record<string, CourseStudentData> = {};

    await Promise.all(
      enrolledCourseIds.map(async (courseId) => {
        const courseResult: CourseStudentData = {
          courseId,
          liveQuiz: null,
          upcomingQuiz: null,
          nextHomework: null,
          nextLectureTs: null,
          nextTutorialTs: null,
          isSemesterOver: semesterOver,
        };

        try {
          const entry: LectureEntry | null = await getLectureEntry({
            courseId,
            instanceId: currentTerm,
          }).catch(() => null);

          const [quizList, homeworkList] = await Promise.all([
            getCourseQuizList(courseId),
            getHomeworkList(courseId),
          ]);

          const quizzes = (quizList || []) as QuizStubInfo[];
          courseResult.liveQuiz =
            quizzes.find((q) => q.quizStartTs <= now && now < q.quizEndTs) ?? null;
          courseResult.upcomingQuiz =
            quizzes
              .filter((q) => q.quizStartTs > now)
              .sort((a, b) => a.quizStartTs - b.quizStartTs)[0] ?? null;

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
        } catch (err) {
          console.error('StudentDashboard fetch error for', courseId, err);
        }

        result[courseId] = courseResult;
      })
    );

    setData(result);
    setLoading(false);
  }, [enrolledCourseIds.join(','), currentTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading };
}
