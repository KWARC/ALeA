import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { Action, ResourceName, toWeekdayIndex } from '@alea/utils';
import { CheatsheetConfig, UploadWindow } from '@alea/spec';
import { isUserIdAuthorizedForAny } from '../access-control/resource-utils';

export function getWeekStartFromDate(date: Date | string, startDay: string | number): Date {
  const base = new Date(date);
  const startDayNum = typeof startDay === 'string' ? toWeekdayIndex(startDay) : startDay;
  const currentDay = base.getDay();
  const diff = (currentDay - startDayNum + 7) % 7;
  const result = new Date(base);
  result.setDate(base.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function isNowWithinWindow(windowStart: Date, windowEnd: Date): boolean {
  const now = new Date();
  return now >= windowStart && now < windowEnd;
}

export function getUploadWindow(
  weekId: Date,
  config: CheatsheetConfig
): { windowStart: Date; windowEnd: Date } {
  const startDayNum =
    typeof config.uploadStartDay === 'string'
      ? toWeekdayIndex(config.uploadStartDay)
      : config.uploadStartDay;
  const endDayNum =
    typeof config.uploadEndDay === 'string'
      ? toWeekdayIndex(config.uploadEndDay)
      : config.uploadEndDay;
  const weekStartBase = getWeekStartFromDate(weekId, startDayNum);
  const windowStart = new Date(weekStartBase);
  const [startH, startM] = config.uploadStartTime.split(':').map(Number);
  windowStart.setHours(startH, startM, 0, 0);
  const daysToEnd = (endDayNum - startDayNum + 7) % 7;
  const windowEnd = new Date(weekStartBase);
  windowEnd.setDate(windowEnd.getDate() + (daysToEnd === 0 ? 7 : daysToEnd));
  const [endH, endM] = config.uploadEndTime.split(':').map(Number);
  windowEnd.setHours(endH, endM, 0, 0);
  return { windowStart, windowEnd };
}

export function getCheatsheetWeekStarts(config: CheatsheetConfig): Date[] {
  const start = new Date(config.cheatsheetStart);
  const end = new Date(config.cheatsheetEnd);
  const startDayNum =
    typeof config.uploadStartDay === 'string'
      ? toWeekdayIndex(config.uploadStartDay)
      : config.uploadStartDay;

  const first = new Date(start);
  const diff = (startDayNum - first.getDay() + 7) % 7;
  first.setDate(first.getDate() + diff);
  const weeks: Date[] = [];
  const current = new Date(first);
  while (current <= end) {
    weeks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getSkippedWeeksSet(config: CheatsheetConfig): Set<string> {
  const skipped = new Set<string>();
  if (!config.cheatsheetSkip) return skipped;
  for (const skipDate of config.cheatsheetSkip) {
    const weekStart = getWeekStartFromDate(new Date(skipDate), config.uploadStartDay);
    skipped.add(formatDateLocal(weekStart));
  }
  return skipped;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const { courseId, instanceId, universityId } = req.query;
  if (!courseId || !instanceId || !universityId) {
    return res.status(400).send('Missing required parameters');
  }
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const isInstructor = await isUserIdAuthorizedForAny(userId, [
    {
      name: ResourceName.COURSE_CHEATSHEET,
      action: Action.MUTATE,
      variables: { courseId: courseId as string, instanceId: instanceId as string },
    },
  ]);
  const isStudent = await isUserIdAuthorizedForAny(userId, [
    {
      name: ResourceName.COURSE_CHEATSHEET,
      action: Action.UPLOAD,
      variables: { courseId: courseId as string, instanceId: instanceId as string },
    },
  ]);
  if (!isInstructor && !isStudent) return res.status(403).send('Unauthorized');

  try {
    const result = await executeAndEndSet500OnError(
      `SELECT cheatsheetConfig FROM courseMetadata 
       WHERE courseId = ? AND instanceId = ? AND universityId = ?`,
      [courseId, instanceId, universityId],
      res
    );
    if (!result) return;
    if (!result.length || !result[0].cheatsheetConfig) {
      return res.status(200).json({
        hasUploadEnabled: false,
        currentWindow: null,
        upcomingWindow: null,
        allWindows: [],
        message: 'Cheatsheet upload config is not set for this course.',
      });
    }

    let config: CheatsheetConfig;
    try {
      config =
        typeof result[0].cheatsheetConfig === 'string'
          ? JSON.parse(result[0].cheatsheetConfig)
          : result[0].cheatsheetConfig;
    } catch {
      return res.status(200).json({
        hasUploadEnabled: false,
        currentWindow: null,
        upcomingWindow: null,
        allWindows: [],
        message: 'Invalid cheatsheet configuration.',
      });
    }

    if (!config.canStudentUploadCheatsheet) {
      return res.status(200).json({
        hasUploadEnabled: false,
        currentWindow: null,
        upcomingWindow: null,
        allWindows: [],
        message: 'Cheatsheet upload is not enabled for this course.',
      });
    }
    const weekStarts: Date[] = getCheatsheetWeekStarts(config);
    const skippedWeeks = getSkippedWeeksSet(config);
    const allWindows: UploadWindow[] = [];
    let currentWindow: UploadWindow | null = null;
    let upcomingWindow: UploadWindow | null = null;
    const now = new Date();
    for (const weekStart of weekStarts) {
      const { windowStart, windowEnd } = getUploadWindow(weekStart, config);
      const weekStartStr = formatDateLocal(weekStart);
      const isSkipped = skippedWeeks.has(weekStartStr);

      const isWithin = isNowWithinWindow(windowStart, windowEnd);
      const isValidCurrentWindow = isWithin && !isSkipped;

      const window: UploadWindow = {
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        isSkipped,
        isWithinWindow: isWithin,
      };

      allWindows.push(window);

      if (isValidCurrentWindow && !currentWindow) {
        currentWindow = window;
      } else if (!upcomingWindow && windowStart > now && !isSkipped) {
        upcomingWindow = window;
      }
    }

    return res.status(200).json({
      hasUploadEnabled: true,
      currentWindow,
      upcomingWindow,
      allWindows,
    });
  } catch (err) {
    console.error('Error fetching cheatsheet upload window:', err);
    return res.status(500).send('Failed to fetch upload window information');
  }
}
