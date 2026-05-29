import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeQuery } from '../comment-utils';

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

  res.status(200).json(data);
}
