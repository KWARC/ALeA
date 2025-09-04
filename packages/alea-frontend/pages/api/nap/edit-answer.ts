import { UpdateAnswerRequest } from '@stex-react/spec';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const { answer, id } = req.body as UpdateAnswerRequest;
  //TODO:Limit the editing untill anybody grade it
  await executeAndEndSet500OnError(
    `Update Answer Set answer=? where id=? and userId=? and not EXISTS (select * from Grading where answerId=?)`,
    [answer, id, userId, id],
    res
  );
  res.status(200).end();
}
