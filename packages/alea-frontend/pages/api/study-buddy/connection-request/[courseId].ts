import { NotificationType } from '@alea/spec';
import { sendStudyBuddyConnectionRequestInDb } from '@alea/node-utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, getUserInfo, sendNotification } from '../../comment-utils';
import { aleaStudyBuddyDb } from '../../study-buddy-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const user = await getUserInfo(req);
  const userId = user?.userId;
  if (!userId) {
    res.status(403).send({ message: 'User info not available' });
    return;
  }
  const courseId = req.query.courseId as string;
  const instanceId = req.query.instanceId as string;
  const institutionId = req.query.institutionId as string;

  if (!institutionId) {
    res.status(422).end('Missing required field: institutionId');
    return;
  }

  const receiverId = req.body?.receiverId;

  if (!receiverId) {
    res.status(400).json({ message: `receiverId not found` });
    return;
  }

  try {
    await sendStudyBuddyConnectionRequestInDb(
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
    sendNotification(
      receiverId,
      `${user.fullName} would like to study together for the ${courseId} course.`,
      '',
      `${user.fullName} würde gerne gemeinsam für den ${courseId}-Kurs lernen.`,
      '',
      NotificationType.STUDY_BUDDY,
      `/study-buddy/${courseId}`
    );
  } catch (error) {
    console.error(error);
    res.status(500).send(getApiErrorResponse(error));
  }
}

function getApiErrorResponse(error: unknown) {
  if (error instanceof Error) return { message: error.message, name: error.name };
  return { message: String(error) };
}
