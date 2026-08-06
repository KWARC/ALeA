import { StudyBuddy } from '@alea/spec';
import { updateStudyBuddyInfoInDb } from '@alea/node-utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, getUserInfo } from '../../comment-utils';
import { aleaStudyBuddyDb } from '../../study-buddy-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const user = await getUserInfo(req);
  const userId = user?.userId;
  if (!userId) return res.status(403).send('User info not available');

  const courseId = req.query.courseId as string;
  const instanceId = req.query.instanceId as string;
  const institutionId = req.query.institutionId as string;

  if (!institutionId || !courseId || !instanceId) {
    res.status(422).end('Missing required field: institutionId or courseId or instanceId');
    return;
  }

  const { intro, studyProgram, email, semester, meetType, languages, dayPreference } =
    req.body as StudyBuddy;

  try {
    await updateStudyBuddyInfoInDb(
      {
        userName: user.fullName,
        userId,
        courseId,
        institutionId,
        instanceId,
        studyBuddy: {
          ...(req.body as StudyBuddy),
          intro,
          studyProgram,
          email,
          semester,
          meetType,
          languages,
          dayPreference,
        },
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
