import { getStudyBuddyListFromDb } from '@alea/node-utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdOrSetError } from '../../comment-utils';
import { aleaStudyBuddyDb } from '../../study-buddy-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const courseId = req.query.courseId as string;
  const instanceId = req.query.instanceId as string;
  const institutionId = req.query.institutionId as string;

  if (!institutionId || !courseId || !instanceId) {
    res.status(422).end('Missing required field: institutionId or courseId or instanceId');
    return;
  }

  try {
    const result = await getStudyBuddyListFromDb(
      {
        userId,
        courseId,
        institutionId,
        instanceId,
      },
      aleaStudyBuddyDb
    );
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send(getApiErrorResponse(error));
  }
}

function getApiErrorResponse(error: unknown) {
  if (error instanceof Error) return { message: error.message, name: error.name };
  return { message: String(error) };
}
