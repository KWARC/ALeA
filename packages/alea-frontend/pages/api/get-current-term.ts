import { NextApiRequest, NextApiResponse } from 'next';
import { getAllCoursesFromDb } from './get-all-courses';
import { getCurrentTermForUniversity } from '@alea/utils';

export async function getCurrentTermByCourseId(): Promise<Record<string, string>> {
  const currentTermByCourseId: Record<string, string> = {};
  const courseInfo = await getAllCoursesFromDb();
  for (const [courseId, info] of Object.entries(courseInfo)) {
    const key = courseId.toLowerCase();
    const universityId = info.universityId ?? 'FAU';
    currentTermByCourseId[key] = getCurrentTermForUniversity(universityId);
  }
  return currentTermByCourseId;
}

export async function getCurrentTermForCourseId(courseId: string): Promise<string | null> {
  console.log('Getting current term for courseId:', courseId);
  const key = courseId.toLowerCase();
  const courseInfo = await getAllCoursesFromDb();
  const info = courseInfo[key];
  if (!info) return null;
  const universityId = info.universityId;
  if (!universityId) return null;
  return getCurrentTermForUniversity(universityId);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const courseId = req.query.courseId as string | undefined;

    if (courseId) {
      const currentTerm = await getCurrentTermForCourseId(courseId);
      if (currentTerm === null) {
        return res.status(404).json({ error: 'Course not found' });
      }
      return res.status(200).json({ courseId, currentTerm });
    }

    const currentTermByCourseId = await getCurrentTermByCourseId();
    return res.status(200).json(currentTermByCourseId);
  } catch (error: any) {
    console.error('[get-current-term] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

