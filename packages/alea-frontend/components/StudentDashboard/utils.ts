import type { LectureSchedule, LectureScheduleItem } from '@alea/spec';
import type { CourseInfo } from '@alea/utils';
import { parseTimeString, pathToCheatSheet, toWeekdayIndex } from '@alea/utils';
import dayjs from 'dayjs';
import type { CourseStudentData, QuickAccessData } from './types';
import { DEFAULT_INSTITUTION } from './types';

export function stripHtml(html: string): string {
  if (typeof html !== 'string') return '';
  return html.replace(/<[^>]+>/g, '').trim();
}

export function getNextOrCurrentScheduleOccurrence(schedule: LectureScheduleItem[]): {
  ts: number;
  venue?: string;
  venueLink?: string;
  isOngoing: boolean;
} | null {
  if (!schedule?.length) return null;
  const now = dayjs();
  let nearest: { ts: number; venue?: string; venueLink?: string } | null = null;
  let current: { ts: number; venue?: string; venueLink?: string } | null = null;

  for (const item of schedule) {
    const startParts = parseTimeString(item.startTime);
    const endParts = parseTimeString(item.endTime ?? item.startTime);
    if (!startParts || !endParts) continue;

    const [startH, startM] = startParts;
    const [endH, endM] = endParts;
    const dayjsDay = item.dayOfWeek === 7 ? 0 : item.dayOfWeek;

    const start = now.day(dayjsDay).hour(startH).minute(startM).second(0).millisecond(0);
    let end = now.day(dayjsDay).hour(endH).minute(endM).second(0).millisecond(0);

    if (end.isBefore(start)) {
      end = end.add(1, 'day');
    }

    if (!now.isBefore(start) && now.isBefore(end)) {
      const ts = start.valueOf();
      if (!current || ts < current.ts) {
        current = { ts, venue: item.venue, venueLink: item.venueLink };
      }
    }

    let candidate = start;
    if (candidate.isBefore(now)) candidate = candidate.add(1, 'week');
    const ts = candidate.valueOf();
    if (!nearest || ts < nearest.ts) {
      nearest = { ts, venue: item.venue, venueLink: item.venueLink };
    }
  }
  if (current) return { ...current, isOngoing: true };
  if (nearest) return { ...nearest, isOngoing: false };
  return null;
}

export function normalizeLectureScheduleEntry(item: Partial<LectureSchedule>): LectureScheduleItem {
  return {
    dayOfWeek: toWeekdayIndex(item.lectureDay ?? '') ?? 1,
    startTime: item.lectureStartTime ?? '00:00',
    endTime: item.lectureEndTime ?? '00:00',
    venue: item.venue,
    venueLink: item.venueLink,
  };
}

export function getAggregatedQuickAccess(
  courseData: Record<string, CourseStudentData>,
  allCourses: Record<string, CourseInfo>
): QuickAccessData {
  const now = Date.now();
  const getCourseName = (id: string) => allCourses[id]?.courseName ?? id;
  const result: QuickAccessData = {
    liveQuiz: null,
    upcomingQuiz: null,
    nextAssignment: null,
    nextLecture: null,
    nextTutorial: null,
    pendingCheatsheetUpload: null,
  };

  const liveQuizEntry = Object.entries(courseData).find(([, info]) => info?.liveQuiz);
  if (liveQuizEntry) {
    const [courseId, info] = liveQuizEntry;
    result.liveQuiz = { courseId, courseName: getCourseName(courseId), data: info.liveQuiz! };
  }

  const isBetterSchedule = (
    candidateTs: number,
    isOngoing: boolean,
    current: { ts: number; isOngoing?: boolean } | null | undefined
  ) => {
    const a = isOngoing ? now : candidateTs;
    const b = current ? (current.isOngoing ? now : current.ts) : null;
    return b == null || a < b;
  };

  for (const courseId of Object.keys(courseData)) {
    const info = courseData[courseId];
    if (!info) continue;
    const name = getCourseName(courseId);

    if (
      info.upcomingQuiz &&
      (!result.upcomingQuiz || info.upcomingQuiz.quizStartTs < result.upcomingQuiz.data.quizStartTs)
    ) {
      result.upcomingQuiz = { courseId, courseName: name, data: info.upcomingQuiz };
    }

    if (info.nextHomework && !info.isSemesterOver) {
      const due = dayjs(info.nextHomework.dueTs).valueOf();
      if (
        due > now &&
        (!result.nextAssignment || due < dayjs(result.nextAssignment.data.dueTs).valueOf())
      ) {
        result.nextAssignment = { courseId, courseName: name, data: info.nextHomework };
      }
    }

    if (
      info.nextLectureTs != null &&
      isBetterSchedule(info.nextLectureTs, !!info.isLectureOngoing, result.nextLecture?.data)
    ) {
      result.nextLecture = {
        courseId,
        courseName: name,
        data: {
          ts: info.nextLectureTs,
          venue: info.nextLectureVenue,
          venueLink: info.nextLectureVenueLink,
          livestreamUrl: allCourses[courseId]?.livestreamUrl,
          isOngoing: info.isLectureOngoing,
        },
      };
    }

    if (
      info.nextTutorialTs != null &&
      isBetterSchedule(info.nextTutorialTs, !!info.isTutorialOngoing, result.nextTutorial?.data)
    ) {
      result.nextTutorial = {
        courseId,
        courseName: name,
        data: {
          ts: info.nextTutorialTs,
          venue: info.nextTutorialVenue,
          venueLink: info.nextTutorialVenueLink,
          isOngoing: info.isTutorialOngoing,
        },
      };
    }

    if (info.cheatsheetUploadPending && !result.pendingCheatsheetUpload) {
      result.pendingCheatsheetUpload = {
        courseId,
        courseName: name,
        data: {
          href: info.cheatsheetUploadHref ?? pathToCheatSheet(DEFAULT_INSTITUTION, courseId),
          windowEndTs: info.cheatsheetUploadWindowEndTs,
        },
      };
    }
  }

  return result;
}

export function hasAnyQuickAccess(quickAccess: QuickAccessData): boolean {
  return Object.values(quickAccess).some(Boolean);
}
