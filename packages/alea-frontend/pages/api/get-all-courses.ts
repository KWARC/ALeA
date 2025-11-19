import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeQuery } from './comment-utils';
import {
  CourseInfo,
  createCourseInfo,
  CURRENT_TERM,
} from '@alea/utils';

interface CourseMetadataRow {
  courseId: string;
  instanceId: string;
  courseName: string;
  notes: string | null;
  landing: string | null;
  slides: string | null;
  institution: string | null;
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

function extractInstructorNames(instructorList: Array<{ id: string; name: string }> | null | undefined): string[] | null {
  if (!instructorList || !Array.isArray(instructorList)) return null;
  return instructorList.map((instructor) => instructor.name || instructor.id).filter(Boolean);
}

function transformDbRowToMetadata(dbRow: any): CourseMetadataRow {
  return {
    courseId: dbRow.courseId,
    instanceId: dbRow.instanceId,
    courseName: dbRow.courseName,
    notes: dbRow.notes || null,
    landing: dbRow.landing || null,
    slides: dbRow.slides || null,
    institution: dbRow.institution || null,
    teaser: dbRow.teaser || null,
    instructors: dbRow.instructors || null,
    hasQuiz: dbRow.hasQuiz || false,
    hasHomework: dbRow.hasHomework || false,
    universityId: dbRow.universityId || null,
  };
}

function transformMetadataToCoursesInfo(
  courseMetadataRows: CourseMetadataRow[],
  currentTerm: string = CURRENT_TERM
): Record<string, CourseInfo> {
  const coursesGroupedById = new Map<string, CourseMetadataRow[]>();
  
  for (const metadataRow of courseMetadataRows) {
    if (!metadataRow?.courseId) continue;
    const normalizedCourseId = metadataRow.courseId.toLowerCase();
    if (!coursesGroupedById.has(normalizedCourseId)) {
      coursesGroupedById.set(normalizedCourseId, []);
    }
    coursesGroupedById.get(normalizedCourseId)!.push(metadataRow);
  }

  const coursesInfoMap: Record<string, CourseInfo> = {};

  for (const [courseId, courseInstances] of coursesGroupedById.entries()) {
    if (!courseInstances.length) continue;
    
    const instancesSortedByCurrentTerm = [...courseInstances].sort((instanceA, instanceB) => {
      const instanceAIsCurrent = instanceA.instanceId === currentTerm;
      const instanceBIsCurrent = instanceB.instanceId === currentTerm;
      if (instanceAIsCurrent && !instanceBIsCurrent) return -1;
      if (!instanceAIsCurrent && instanceBIsCurrent) return 1;
      return 0;
    });

    const primaryCourseInstance = instancesSortedByCurrentTerm[0];
    if (!primaryCourseInstance) continue;

    const isCurrentTerm = instancesSortedByCurrentTerm.some((instance) => instance.instanceId === currentTerm);
    const hasQuizEnabled = instancesSortedByCurrentTerm.some((instance) => !!instance.hasQuiz);
    const hasHomeworkEnabled = instancesSortedByCurrentTerm.some((instance) => !!instance.hasHomework);

    const semesterInstances = instancesSortedByCurrentTerm
      .filter((instance) => !!instance.instanceId)
      .map((instance) => {
        const instructorList = parseJsonWithFallback<Array<{ id: string; name: string }>>(instance.instructors, []);
        return {
          semester: instance.instanceId,
          instructors: extractInstructorNames(instructorList),
        };
      });

    const primaryInstructorList = parseJsonWithFallback<Array<{ id: string; name: string }>>(
      primaryCourseInstance.instructors,
      []
    );
    const primaryInstructorNames = extractInstructorNames(primaryInstructorList);

    coursesInfoMap[courseId] = createCourseInfo(
      courseId,
      primaryCourseInstance.courseName || courseId.toUpperCase(),
      primaryCourseInstance.notes || '',
      primaryCourseInstance.landing || '',
      isCurrentTerm,
      hasQuizEnabled,
      hasHomeworkEnabled,
      primaryCourseInstance.institution || primaryCourseInstance.universityId || undefined,
      semesterInstances.length > 0 ? semesterInstances : undefined,
      primaryInstructorNames,
      primaryCourseInstance.teaser ?? null,
      primaryCourseInstance.slides ?? undefined
    );
  }

  return coursesInfoMap;
}

export async function getAllCoursesFromDb(
  universityId?: string,
  institution?: string
): Promise<Record<string, CourseInfo>> {
  let sqlQuery: string;
  let queryParameters: any[];

  if (universityId) {
    sqlQuery = `SELECT * FROM courseMetadata WHERE universityId = ? ORDER BY courseId, instanceId`;
    queryParameters = [universityId];
  } else if (institution) {
    sqlQuery = `SELECT * FROM courseMetadata WHERE institution = ? ORDER BY courseId, instanceId`;
    queryParameters = [institution];
  } else {
    sqlQuery = `SELECT * FROM courseMetadata ORDER BY courseId, instanceId`;
    queryParameters = [];
  }

  const dbQueryResults = await executeQuery<any[]>(sqlQuery, queryParameters);

  if (!dbQueryResults || (dbQueryResults as any).error || !Array.isArray(dbQueryResults)) {
    console.warn('[getAllCoursesFromDb] Failed to fetch courses from database');
    return {};
  }

  const courseMetadataRows: CourseMetadataRow[] = dbQueryResults.map(transformDbRowToMetadata);
  const coursesInfoMap = transformMetadataToCoursesInfo(courseMetadataRows, CURRENT_TERM);

  return coursesInfoMap;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const universityId = req.query.universityId as string | undefined;
  const institution = req.query.institution as string | undefined;

  try {
    const coursesInfoMap = await getAllCoursesFromDb(universityId, institution);
    res.status(200).json(coursesInfoMap);
  } catch (error: any) {
    console.error('[get-all-courses] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
