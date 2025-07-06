import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeDontEndSet500OnError,
} from '../comment-utils';
export async function getJobApplicationUsingIdOrSet500OnError(id: number, res: NextApiResponse) {
  const results = await executeDontEndSet500OnError(
    'SELECT * FROM jobApplication WHERE id = ?',
    [id],
    res
  );
  if (!results) return;
  return results[0] || [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const {
    id,
    applicationStatus,
    applicantAction,
    recruiterAction,
    studentMessage,
    recruiterMessage,
  } = req.body;

  if (!id) return res.status(422).send('Job Application Id is missing');

  const currentJobApplication = await getJobApplicationUsingIdOrSet500OnError(id, res);
  if (!currentJobApplication) return;
  const { updatedAt } = currentJobApplication;

  const result = await executeAndEndSet500OnError(
    'UPDATE jobApplication SET applicationStatus = ?, applicantAction = ?, recruiterAction = ?, studentMessage = ?, recruiterMessage=?,updatedAt=? WHERE id = ?',
    [
      applicationStatus,
      applicantAction,
      recruiterAction,
      studentMessage,
      recruiterMessage,
      updatedAt,
      id,
    ],
    res
  );
  if (!result) return;

  res.status(200).end();
}
