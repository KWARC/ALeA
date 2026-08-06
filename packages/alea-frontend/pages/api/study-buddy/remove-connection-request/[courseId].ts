import { removeStudyBuddyConnectionRequestFromDb } from '@alea/node-utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, getUserIdOrSetError } from '../../comment-utils';
import { aleaStudyBuddyDb } from '../../study-buddy-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const courseId = req.query.courseId as string;
  const instanceId = req.query.instanceId as string;
  const institutionId = req.query.institutionId as string;

  if (!institutionId || !courseId || !instanceId) {
    res.status(422).end('Missing required field: institutionId or courseId or instanceId');
    return;
  }

  const receiverId = req.body?.receiverId;

  if (!receiverId) {
    res.status(400).json({ message: `receiverId not found` });
    return;
  }

  try {
    await removeStudyBuddyConnectionRequestFromDb(
      {
        userId,
        receiverId,
        courseId,
        institutionId,
        instanceId,
      },
      aleaStudyBuddyDb
    );

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).send(getApiErrorResponse(error));
  }
}

function getApiErrorResponse(error: unknown) {
  if (error instanceof Error) return { message: error.message, name: error.name };
  return { message: String(error) };
}
