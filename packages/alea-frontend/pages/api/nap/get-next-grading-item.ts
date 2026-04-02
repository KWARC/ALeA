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

function weightedRandomSelect<T extends { userId: string; answerId?: number; questionId?: string }>(
  candidates: T[],
  contributionMap: Map<string, { done: number; received: number }>
): T {
  const weights = candidates.map((c) => {
    const stats = contributionMap.get(c.userId) ?? { done: 0, received: 0 };
    return (stats.done + 1) / (stats.received + 1);
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const random = Math.random() * totalWeight;

  console.log('\n========== [PEER GRADING] Weighted Selection Debug ==========');
  console.log(`Total candidates: ${candidates.length}`);
  console.log(
    `Random number drawn: ${random.toFixed(4)} (out of totalWeight: ${totalWeight.toFixed(4)})`
  );
  console.log('--------------------------------------------------------------');

  let cumulative = 0;
  let selectedIndex = candidates.length - 1;

  for (let i = 0; i < candidates.length; i++) {
    const stats = contributionMap.get(candidates[i].userId) ?? { done: 0, received: 0 };
    const rangeStart = cumulative;
    cumulative += weights[i];
    const rangeEnd = cumulative;
    const isSelected = random <= cumulative && selectedIndex === candidates.length - 1;
    if (isSelected) selectedIndex = i;

    console.log(
      `Candidate ${i + 1}: userId=${candidates[i].userId} | answerId=${
        candidates[i].answerId ?? 'N/A'
      }` +
        `\n  done=${stats.done}, received=${stats.received} => weight=${weights[i].toFixed(4)}` +
        `\n  cumulative range: [${rangeStart.toFixed(4)} -> ${rangeEnd.toFixed(4)}]` +
        `\n  ${isSelected ? 'SELECTED' : 'not selected'}`
    );
  }

  console.log('--------------------------------------------------------------');
  console.log(
    `Final selection: userId=${candidates[selectedIndex].userId} | answerId=${
      candidates[selectedIndex].answerId ?? 'N/A'
    }`
  );
  console.log('=============================================================\n');

  return candidates[selectedIndex];
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

  console.log(
    `[PEER GRADING] grader=${currentUserId} courseId=${courseId} courseInstance=${courseInstanceId}`
  );

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

  const queryParams: (string | number)[] = [
    courseId,
    courseInstanceId,
    currentUserId,
    currentUserId,
  ];
  if (excludeAnswerIds.length) queryParams.push(...excludeAnswerIds);

  const candidateGradingItems = await executeAndEndSet500OnError<
    (GradingItem & { userId: string })[]
  >(
    `SELECT
        a.homeworkId AS homeworkId,
        a.questionId AS questionId,
        a.userId AS userId,
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
      ORDER BY MAX(a.updatedAt) ASC, MIN(a.id) ASC`,
    queryParams,
    res
  );
  if (!candidateGradingItems) return;
  if (!candidateGradingItems.length) {
    console.log(`[PEER GRADING] No candidates found.`);
    return res.status(200).json({ gradingItem: null, responses: [] });
  }

  const candidateUserIds = [...new Set(candidateGradingItems.map((c) => c.userId))];
  console.log(
    `[PEER GRADING] ${candidateGradingItems.length} rows, ${
      candidateUserIds.length
    } unique users: [${candidateUserIds.join(', ')}]`
  );

  const ph = candidateUserIds.map(() => '?').join(', ');
  console.log(
    `[PEER GRADING] SQL placeholders: (${ph}) for values: [${candidateUserIds.join(', ')}]`
  );

  const doneRows = await executeAndEndSet500OnError<{ userId: string; count: number }[]>(
    `SELECT g.checkerId AS userId, COUNT(DISTINCT g.answerId) AS count
     FROM Grading g
     WHERE g.reviewType = 'PEER'
       AND g.checkerId IN (${ph})
     GROUP BY g.checkerId`,
    [...candidateUserIds],
    res
  );
  if (!doneRows) return;
  console.log(`[PEER GRADING] doneRows=${JSON.stringify(doneRows)}`);

  const receivedRows = await executeAndEndSet500OnError<{ userId: string; count: number }[]>(
    `SELECT a.userId, COUNT(DISTINCT g.id) AS count
     FROM Answer a
     INNER JOIN Grading g ON g.answerId = a.id
     WHERE g.reviewType = 'PEER'
       AND a.userId IN (${ph})
       AND a.courseId = ?
       AND a.courseInstance = ?
     GROUP BY a.userId`,
    [...candidateUserIds, courseId, courseInstanceId],
    res
  );
  if (!receivedRows) return;
  console.log(`[PEER GRADING] receivedRows=${JSON.stringify(receivedRows)}`);

  const doneMap = new Map(doneRows.map((r) => [r.userId, Number(r.count)]));
  const receivedMap = new Map(receivedRows.map((r) => [r.userId, Number(r.count)]));

  const contributionMap = new Map(
    candidateUserIds.map((uid) => [
      uid,
      {
        done: doneMap.get(uid) ?? 0,
        received: receivedMap.get(uid) ?? 0,
      },
    ])
  );

  console.log('[PEER GRADING] Contribution stats:');
  for (const [uid, s] of contributionMap.entries()) {
    console.log(
      `  ${uid} done=${s.done} received=${s.received} weight=${(
        (s.done + 1) /
        (s.received + 1)
      ).toFixed(4)}`
    );
  }

  const uniqueUserCandidates = candidateUserIds.map(
    (uid) => candidateGradingItems.find((c) => c.userId === uid)!
  );
  const selected = weightedRandomSelect(uniqueUserCandidates, contributionMap);
  const { userId: _hidden, ...gradingItem } = selected;

  const ctxRows = await executeAndEndSet500OnError<
    { questionId: string; userId: string; courseId: string; courseInstance: string }[]
  >(
    'SELECT questionId, userId, courseId, courseInstance FROM Answer WHERE id = ?',
    [gradingItem.answerId],
    res
  );
  if (!ctxRows?.length) return res.status(200).json({ gradingItem: null, responses: [] });
  const ctx = ctxRows[0];

  const responses = await executeAndEndSet500OnError<{ subProblemId: string; answer: string }[]>(
    `SELECT subProblemId, answer
     FROM Answer
     WHERE questionId = ? AND userId = ? AND courseId = ? AND courseInstance = ?
     ORDER BY subProblemId`,
    [ctx.questionId, ctx.userId, ctx.courseId, ctx.courseInstance],
    res
  );
  if (!responses) return;

  console.log(
    `[PEER GRADING] Serving: owner=${ctx.userId} answerId=${gradingItem.answerId} responses=${responses.length}`
  );

  res.status(200).json({ gradingItem, responses });
}
