import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  checkIfQueryParameterExistOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { getAllGradingsOrSetError } from './get-answers-info';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  if (!checkIfQueryParameterExistOrSetError(req, res, 'answerId')) return;
  const answerId = +req.query.answerId;
  if (!checkIfQueryParameterExistOrSetError(req, res, 'subProblemId')) return;
  const subProblemId = req.query.subProblemId as string;

  const institutionId = req.query.institutionId as string;
  if (!institutionId) return res.status(422).end('Missing institutionId');

  const answers = await executeAndEndSet500OnError<[]>(
    'SELECT id FROM Answer WHERE userId=? AND id=? AND subProblemId=? AND homeworkId IS NULL AND institutionId=?',
    [userId, answerId, subProblemId, institutionId],
    res
  );
  if (!answers) return;
  if (!answers.length) return res.status(404).end();

  const gradings = await getAllGradingsOrSetError({ [subProblemId]: answerId }, res);
  if (!gradings) return;
  return res.json(gradings[subProblemId]);
}
