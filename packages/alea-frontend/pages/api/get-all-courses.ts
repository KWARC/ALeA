import { CourseInfo, createCourseInfo, getCurrentTermForUniversity } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeQuery } from './comment-utils';

interface CourseMetadataRow {
  courseId: string;
  instanceId: string;
  courseName: string;
  notes: string | null;
  landing: string | null;
  slides: string | null;
  teaser: string | null;
  instructors: string | null;
  hasQuiz: boolean;
  hasHomework: boolean;
  universityId: string | null;
}

function parseJsonWithFallback<T>(jsonString: string | null | undefined, fallbackValue: T): T {
  if (!jsonString) return fallbackValue;
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Failed to parse JSON field:', error);
    return fallbackValue;
  }
}

function extractInstructorNames(
  instructorList: Array<{ id: string; name: string }> | null | undefined
): string[] | null {
  if (!instructorList || !Array.isArray(instructorList)) return null;
  return instructorList.map((instructor) => instructor.name || instructor.id).filter(Boolean);
}

function computeCurrentTermByCourseId(
  courseMetadataRows: CourseMetadataRow[]
): Record<string, string> {
  const currentTermByCourseId: Record<string, string> = {};

  for (const row of courseMetadataRows) {
    if (!row.courseId) continue;
    const normalizedId = row.courseId.toLowerCase();
    if (!currentTermByCourseId[normalizedId]) {
      const universityId = row.universityId ?? 'FAU';
      currentTermByCourseId[normalizedId] = getCurrentTermForUniversity(universityId);
    }
  }

  return currentTermByCourseId;
}

function transformMetadataToCoursesInfo(
  courseMetadataRows: CourseMetadataRow[],
  currentTermByCourseId: Record<string, string>
): Record<string, CourseInfo> {
  const grouped = new Map<string, CourseMetadataRow[]>();

  // group by courseId
  for (const row of courseMetadataRows) {
    const id = row.courseId.toLowerCase();
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id)!.push(row);
  }

  const coursesInfoMap: Record<string, CourseInfo> = {};

  for (const [courseId, instances] of grouped.entries()) {
    const currentTerm = currentTermByCourseId[courseId] ?? 'null';

    // sort current term first
    const sorted = [...instances].sort((a, b) => {
      const aIsCurrent = a.instanceId === currentTerm;
      const bIsCurrent = b.instanceId === currentTerm;
      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;
      return 0;
    });

    const primary = sorted[0];
    if (!primary) continue;

    const isCurrentTerm = sorted.some((i) => i.instanceId === currentTerm);
    const hasQuiz = sorted.some((i) => !!i.hasQuiz);
    const hasHomework = sorted.some((i) => !!i.hasHomework);

    const semesterInstances = sorted.map((instance) => {
      const instructorList = parseJsonWithFallback<Array<{ id: string; name: string }>>(
        instance.instructors,
        []
      );
      return {
        semester: instance.instanceId,
        instructors: extractInstructorNames(instructorList),
      };
    });

    const primaryInstructorList = parseJsonWithFallback<Array<{ id: string; name: string }>>(
      primary.instructors,
      []
    );
    const primaryInstructorNames = extractInstructorNames(primaryInstructorList) ?? undefined;

    coursesInfoMap[courseId] = createCourseInfo(
      courseId,
      primary.courseName,
      primary.notes || '',
      primary.landing || '',
      isCurrentTerm,
      hasQuiz,
      hasHomework,
      primary.universityId || undefined,
      semesterInstances,
      primaryInstructorNames,
      primary.teaser ?? null,
      primary.slides ?? undefined
    );
  }

  return coursesInfoMap;
}

export async function getAllCoursesFromDb(
  universityId?: string
): Promise<Record<string, CourseInfo>> {
  let sqlQuery = `
    SELECT
      courseId,
      instanceId,
      courseName,
      notes,
      landing,
      slides,
      teaser,
      instructors,
      hasQuiz,
      hasHomework,
      universityId
    FROM courseMetadata
  `;

  const params: any[] = [];

  if (universityId) {
    sqlQuery += ' WHERE universityId = ?';
    params.push(universityId);
  }

  sqlQuery += ' ORDER BY courseId, instanceId';

  const dbResults = await executeQuery<CourseMetadataRow[]>(sqlQuery, params);

  if (!Array.isArray(dbResults)) {
    console.warn('[getAllCoursesFromDb] Failed to fetch rows');
    return {};
  }

  const rows = dbResults;

  const currentTermByCourseId = computeCurrentTermByCourseId(rows);
  const coursesInfoMap = transformMetadataToCoursesInfo(rows, currentTermByCourseId);

  return coursesInfoMap;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const universityId = req.query.universityId as string | undefined;

  try {
    const coursesInfoMap = await getAllCoursesFromDb(universityId);
    res.status(200).json(coursesInfoMap);
  } catch (error) {
    console.error('[get-all-courses] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
