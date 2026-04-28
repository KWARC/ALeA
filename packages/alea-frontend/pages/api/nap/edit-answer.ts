import { UpdateAnswerRequest } from '@alea/spec';
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
  const { answer, id, institutionId  } = req.body as UpdateAnswerRequest;
  if (!institutionId) {
  return res.status(422).end('Missing institutionId');
}
  //TODO:Limit the editing untill anybody grade it
  await executeAndEndSet500OnError(
    `Update Answer Set answer=? where id=? and userId=? and institutionId=? and not EXISTS (select * from Grading where answerId=?)`,
    [answer, id, userId, institutionId, id],
    res
  );
  res.status(200).end();
}
