import { GradingItem } from '@alea/spec';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  checkIfQueryParameterExistOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { getCurrentTermForCourseId } from '../get-current-term';
import { getCourseEnrollmentAcl } from '../../../components/courseHelpers';
import { isMemberOfAcl } from '../acl-utils/acl-common-utils';

function parseExcludeAnswerIds(excludeAnswerIdsInput: string | string[] | undefined): number[] {
  const excludeAnswerIdsCsv = Array.isArray(excludeAnswerIdsInput)
    ? excludeAnswerIdsInput.join(',')
    : excludeAnswerIdsInput || '';
  return Array.from(
    new Set(
      excludeAnswerIdsCsv
        .split(',')
        .map((rawId) => Number(rawId.trim()))
        .filter((parsedId) => Number.isFinite(parsedId))
    )
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  if (!checkIfQueryParameterExistOrSetError(req, res, 'courseId')) return;

  const courseId = req.query.courseId as string;
  const courseInstanceId =
    (req.query.courseInstance as string) ?? (await getCurrentTermForCourseId(courseId));
  if (!courseInstanceId) return res.status(422).send('Missing course instance');

  const currentUserId = await getUserIdOrSetError(req, res);
  if (!currentUserId) return;

  const enrollmentAclId = getCourseEnrollmentAcl(courseId, courseInstanceId);
  const isEnrolled = await isMemberOfAcl(enrollmentAclId, currentUserId);
  if (!isEnrolled) return res.status(403).send('Not enrolled in course');

  const excludeAnswerIds = parseExcludeAnswerIds(
    req.query.excludeAnswerIds as string | string[] | undefined
  );

  let exclusionQuery = '';
  if (excludeAnswerIds.length > 0) {
    const excludeIdPlaceholders = excludeAnswerIds.map(() => '?').join(',');
    exclusionQuery = `HAVING MIN(a.id) NOT IN (${excludeIdPlaceholders})`;
  }

  const queryParams: (string | number)[] = [courseId, courseInstanceId, currentUserId, currentUserId];
  if (excludeAnswerIds.length) queryParams.push(...excludeAnswerIds);

  const candidateGradingItems = await executeAndEndSet500OnError<GradingItem[]>(
    `SELECT
        a.homeworkId AS homeworkId,
        a.questionId AS questionId,
        'hidden' AS studentId,
        MIN(a.id) AS answerId,
        MAX(a.updatedAt) AS updatedAt,
        COUNT(DISTINCT a.subProblemId) AS numSubProblemsAnswered,
        COUNT(DISTINCT CASE WHEN g.reviewType IS NOT NULL THEN a.subProblemId END) AS numSubProblemsGraded,
        COUNT(DISTINCT CASE WHEN g.reviewType = 'INSTRUCTOR' THEN a.subProblemId END) AS numSubProblemsInstructorGraded
      FROM Answer a
      LEFT JOIN Grading g ON g.answerId = a.id
      WHERE a.courseId = ?
        AND a.courseInstance = ?
        AND (a.homeworkId IS NULL OR a.homeworkId = 0)
        AND a.userId <> ?
        AND NOT EXISTS (
          SELECT 1
          FROM Answer ax
          INNER JOIN Grading myg ON myg.answerId = ax.id
          WHERE ax.courseId = a.courseId
            AND ax.courseInstance = a.courseInstance
            AND ax.questionId = a.questionId
            AND ax.userId = a.userId
            AND myg.checkerId = ?
        )
      GROUP BY a.homeworkId, a.questionId, a.userId
      ${exclusionQuery}
      ORDER BY MAX(a.updatedAt) ASC, MIN(a.id) ASC
      LIMIT 1`,
    queryParams,
    res
  );
  if (!candidateGradingItems) return;
  const gradingItem = candidateGradingItems[0];
  if (!gradingItem) return res.status(200).json({ gradingItem: null, responses: [] });

  const selectedAnswerContextRows = await executeAndEndSet500OnError<
    { questionId: string; userId: string; courseId: string; courseInstance: string }[]
  >(
    'SELECT questionId, userId, courseId, courseInstance FROM Answer WHERE id = ?',
    [gradingItem.answerId],
    res
  );
  if (!selectedAnswerContextRows?.length)
    return res.status(200).json({ gradingItem: null, responses: [] });
  const selectedAnswerContext = selectedAnswerContextRows[0];

  const groupedAnswerResponses = await executeAndEndSet500OnError<
    { subProblemId: string; answer: string }[]
  >(
    `SELECT subProblemId, answer
     FROM Answer
     WHERE questionId = ? AND userId = ? AND courseId = ? AND courseInstance = ?
     ORDER BY subProblemId`,
    [
      selectedAnswerContext.questionId,
      selectedAnswerContext.userId,
      selectedAnswerContext.courseId,
      selectedAnswerContext.courseInstance,
    ],
    res
  );
  if (!groupedAnswerResponses) return;

  res.status(200).json({ gradingItem, responses: groupedAnswerResponses });
}
