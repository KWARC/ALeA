import { Action, ResourceName } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { isUserIdAuthorizedForAny } from '../access-control/resource-utils';
import { checkIfGetOrSetError, executeQuery, getUserId } from '../comment-utils';

function safeParseJson<T>(val: unknown, fallback: T): T {
  if (val == null) return fallback;
  if (typeof val === 'object') return val as T;
  if (typeof val !== 'string') return fallback;
  try {
    return JSON.parse(val.trim()) as T;
  } catch {
    return fallback;
  }
}

function parseInstructors(val: unknown): Array<{ id?: string; name?: string }> {
  if (val == null) return [];
  if (Array.isArray(val)) return val;
  if (typeof val !== 'string') return [];
  const s = val.trim();
  if (!s) return [];
  try {
    const p = JSON.parse(s);
    return Array.isArray(p) ? p : [{ name: s }];
  } catch {
    return [{ name: s }];
  }
}

export async function getCourseInfoMetadataFromDb(courseId: string, instanceId: string) {
  const result = await executeQuery<any[]>(
    `SELECT * FROM courseMetadata WHERE courseId = ? AND instanceId = ?`,
    [courseId, instanceId]
  );

  if (result && Array.isArray(result) && result.length > 0) {
    const data = result[0];
    data.instructors = parseInstructors(data.instructors);
    data.lectureSchedule = safeParseJson(data.lectureSchedule, []);
    data.tutorialSchedule = safeParseJson(data.tutorialSchedule, []);
    return JSON.parse(JSON.stringify(data));
  }
  return null;
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { courseId, instanceId } = req.query;
  if (!courseId || !instanceId) {
    return res.status(422).end('Missing required fields');
  }

  const data = await getCourseInfoMetadataFromDb(courseId as string, instanceId as string);

  if (!data) {
    return res.status(404).end('Course metadata not found');
  }

  const viewerId = await getUserId(req);
  const canSeeInstructorIds = viewerId
    ? await isUserIdAuthorizedForAny(viewerId, [
        {
          name: ResourceName.COURSE_METADATA,
          action: Action.MUTATE,
          variables: { courseId: courseId as string, instanceId: instanceId as string },
        },
      ])
    : false;

  if (!canSeeInstructorIds && Array.isArray(data.instructors)) {
    data.instructors = data.instructors.map(({ name, url }: { name?: string; url?: string }) => ({
      name,
      url,
    }));
  }

  const omitTutorName = (entries: unknown) =>
    Array.isArray(entries)
      ? entries.map((entry) => {
          if (!entry || typeof entry !== 'object') return entry;
          const { tutorName: _tutorName, ...rest } = entry as Record<string, unknown>;
          return rest;
        })
      : entries;
  data.lectureSchedule = omitTutorName(data.lectureSchedule);
  data.tutorialSchedule = omitTutorName(data.tutorialSchedule);

  res.status(200).json(data);
}
