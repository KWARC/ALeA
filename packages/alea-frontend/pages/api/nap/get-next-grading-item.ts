import { GradingItem } from '@alea/spec';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  checkIfQueryParameterExistOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { getCurrentTermForCourseId } from '../get-current-term';
import { isMemberOfAcl } from '../acl-utils/acl-common-utils';
import { getCourseEnrollmentAcl } from '../../../components/courseHelpers';

const PEER_CONTRIBUTION_CACHE_TTL_MS = 30_000;

interface PeerContributionCounts {
  reviewsGiven: number;
  reviewsReceived: number;
}

interface PeerContributionCacheEntry {
  countsByUserId: Map<string, PeerContributionCounts>;
  expiresAt: number;
}

const peerContributionCache = new Map<string, PeerContributionCacheEntry>();
const inflightPeerContributionLoads = new Map<
  string,
  Promise<Map<string, PeerContributionCounts>>
>();

async function fetchPeerContributionCounts(
  userIds: string[],
  courseId: string,
  courseInstanceId: string,
  res: NextApiResponse
): Promise<Map<string, PeerContributionCounts> | null> {
  const cacheKey = `${courseId}::${courseInstanceId}`;
  const cached = peerContributionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.countsByUserId;
  }

  const inflight = inflightPeerContributionLoads.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const loadPromise = (async (): Promise<Map<string, PeerContributionCounts>> => {
    try {
      const inList = userIds.map(() => '?').join(', ');
      const [givenRows, receivedRows] = await Promise.all([
        executeAndEndSet500OnError<{ userId: string; count: number }[]>(
          `SELECT g.checkerId AS userId, COUNT(DISTINCT g.answerId) AS count
           FROM Grading g
           WHERE g.reviewType = 'PEER'
             AND g.checkerId IN (${inList})
           GROUP BY g.checkerId`,
          [...userIds],
          res
        ),
        executeAndEndSet500OnError<{ userId: string; count: number }[]>(
          `SELECT a.userId, COUNT(DISTINCT g.id) AS count
           FROM Answer a
           INNER JOIN Grading g ON g.answerId = a.id
           WHERE g.reviewType = 'PEER'
             AND a.userId IN (${inList})
             AND a.courseId = ?
             AND a.courseInstance = ?
           GROUP BY a.userId`,
          [...userIds, courseId, courseInstanceId],
          res
        ),
      ]);

      if (!givenRows || !receivedRows) {
        return new Map();
      }

      const givenByUserId = new Map(givenRows.map((r) => [r.userId, Number(r.count)]));
      const receivedByUserId = new Map(receivedRows.map((r) => [r.userId, Number(r.count)]));

      const countsByUserId = new Map<string, PeerContributionCounts>(
        userIds.map((id) => [
          id,
          {
            reviewsGiven: givenByUserId.get(id) ?? 0,
            reviewsReceived: receivedByUserId.get(id) ?? 0,
          },
        ])
      );

      peerContributionCache.set(cacheKey, {
        countsByUserId,
        expiresAt: Date.now() + PEER_CONTRIBUTION_CACHE_TTL_MS,
      });
      return countsByUserId;
    } finally {
      inflightPeerContributionLoads.delete(cacheKey);
    }
  })();

  inflightPeerContributionLoads.set(cacheKey, loadPromise);
  return loadPromise;
}

function parseExcludedAnswerIds(raw: string | string[] | undefined): number[] {
  const csv = Array.isArray(raw) ? raw.join(',') : raw || '';
  return Array.from(
    new Set(
      csv
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n))
    )
  );
}

function pickWeightedByPeerContribution<T extends { userId: string }>(
  candidates: T[],
  peerContributionByUserId: Map<string, PeerContributionCounts>
): T {
  const weights = candidates.map((c) => {
    const n = peerContributionByUserId.get(c.userId) ?? {
      reviewsGiven: 0,
      reviewsReceived: 0,
    };
    return (n.reviewsGiven + 1) / (n.reviewsReceived + 1);
  });

  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      return candidates[i];
    }
  }
  return candidates[candidates.length - 1];
}

type AnswerGroupRow = GradingItem & { userId: string };

function firstQueuedRowPerAuthor(rows: AnswerGroupRow[]): AnswerGroupRow[] {
  const byAuthor = new Map<string, AnswerGroupRow>();
  for (const row of rows) {
    if (!byAuthor.has(row.userId)) {
      byAuthor.set(row.userId, row);
    }
  }
  return [...byAuthor.values()];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  if (!checkIfQueryParameterExistOrSetError(req, res, 'courseId')) return;

  const courseId = req.query.courseId as string;
  const courseInstanceId =
    (req.query.courseInstance as string) ?? (await getCurrentTermForCourseId(courseId));
  if (!courseInstanceId) return res.status(422).send('Missing course instance');

  const graderUserId = await getUserIdOrSetError(req, res);
  if (!graderUserId) return;

  const enrollmentAclId = getCourseEnrollmentAcl(courseId, courseInstanceId);
  const isEnrolled = await isMemberOfAcl(enrollmentAclId, graderUserId);
  if (!isEnrolled) return res.status(403).send('Not enrolled in course');

  const excludedAnswerIds = parseExcludedAnswerIds(
    req.query.excludeAnswerIds as string | string[] | undefined
  );

  const excludeClause =
    excludedAnswerIds.length > 0
      ? `HAVING MIN(a.id) NOT IN (${excludedAnswerIds.map(() => '?').join(',')})`
      : '';

  const sqlParams: (string | number)[] = [
    courseId,
    courseInstanceId,
    graderUserId,
    graderUserId,
  ];
  if (excludedAnswerIds.length) {
    sqlParams.push(...excludedAnswerIds);
  }

  const candidateRows = await executeAndEndSet500OnError<AnswerGroupRow[]>(
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
      ${excludeClause}
      ORDER BY MAX(a.updatedAt) ASC, MIN(a.id) ASC`,
    sqlParams,
    res
  );
  if (!candidateRows) return;
  if (!candidateRows.length) {
    return res.status(200).json({ gradingItem: null, responses: [] });
  }

  const distinctAuthorRows = firstQueuedRowPerAuthor(candidateRows);
  const peerContributionByUserId = await fetchPeerContributionCounts(
    distinctAuthorRows.map((r) => r.userId),
    courseId,
    courseInstanceId,
    res
  );
  if (!peerContributionByUserId) return;

  const selectedRow = pickWeightedByPeerContribution(distinctAuthorRows, peerContributionByUserId);
  const { userId: _authorUserId, ...gradingItem } = selectedRow;

  const anchorRows = await executeAndEndSet500OnError<
    { questionId: string; userId: string; courseId: string; courseInstance: string }[]
  >(
    'SELECT questionId, userId, courseId, courseInstance FROM Answer WHERE id = ?',
    [gradingItem.answerId],
    res
  );
  if (!anchorRows?.length) return res.status(200).json({ gradingItem: null, responses: [] });
  const anchor = anchorRows[0];

  const responses = await executeAndEndSet500OnError<{ subProblemId: string; answer: string }[]>(
    `SELECT subProblemId, answer
     FROM Answer
     WHERE questionId = ? AND userId = ? AND courseId = ? AND courseInstance = ?
     ORDER BY subProblemId`,
    [anchor.questionId, anchor.userId, anchor.courseId, anchor.courseInstance],
    res
  );
  if (!responses) return;

  res.status(200).json({ gradingItem, responses });
}
