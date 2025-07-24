import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError, executeQuery } from '../comment-utils';

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

  const currentJobApplication: any = await executeQuery(
    'SELECT * FROM jobApplication WHERE id = ?',
    [id]
  );
  if (!currentJobApplication) {
    res.status(404).send('Job Application not found');
    return;
  }
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
