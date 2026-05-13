import { CreateAnswerRequest, getHomeworkPhase } from '@alea/spec';
import { getCurrentTermForCourseId } from '../get-current-term';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { getHomeworkOrSetError } from '../homework/get-homework';

interface ExistingAnswerRow {
  id: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const { questionId, questionTitle, subProblemId, courseId, homeworkId, institutionId } =
    req.body as CreateAnswerRequest;
  let { courseInstance, answer } = req.body as CreateAnswerRequest;

  if (homeworkId) {
    const homework = await getHomeworkOrSetError(homeworkId, false, res);
    const phase = getHomeworkPhase(homework);
    if (phase !== 'GIVEN') return res.status(410).send('Answers are not being accepted');
  }

  if (!answer || !questionId) return res.status(422).end();
  if (!courseInstance) courseInstance = await getCurrentTermForCourseId(courseId);
  answer = answer.trim();
  const normalizedHomeworkId = Number(homeworkId || 0);

  const existing = await executeAndEndSet500OnError<ExistingAnswerRow[]>(
    `SELECT a.id
     FROM Answer a
     WHERE a.questionId = ?
       AND a.userId = ?
       AND a.subProblemId = ?
       AND a.courseId = ?
       AND a.courseInstance = ?
       AND IFNULL(a.homeworkId, 0) = ?
       AND NOT EXISTS (SELECT 1 FROM Grading g WHERE g.answerId = a.id)
     ORDER BY a.updatedAt DESC, a.id DESC
     LIMIT 1`,
    [questionId, userId, subProblemId, courseId, courseInstance, normalizedHomeworkId],
    res
  );
  if (!existing) return;
  if (existing.length > 0) {
    const id = existing[0].id;
    const updateResult = await executeAndEndSet500OnError(
      `UPDATE Answer SET answer = ?, questionTitle = ?, institutionId = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?`,
      [answer, questionTitle, institutionId, id, userId],
      res
    );
    if (!updateResult) return;
    return res.status(200).send({ id });
  }

  const result = await executeAndEndSet500OnError(
    `INSERT INTO Answer (questionId, userId, answer, questionTitle, subProblemId, courseId, courseInstance, institutionId, homeworkId) VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      questionId,
      userId,
      answer,
      questionTitle,
      subProblemId,
      courseId,
      courseInstance,
      institutionId,
      normalizedHomeworkId,
    ],
    res
  );
  if (!result) return;
  res.status(201).send({ id: result.insertId });
}
