import { StudyBuddy } from '@stex-react/spec';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserInfo,
} from '../../comment-utils';
import { getSbCourseId } from '../study-buddy-utils';
import { CURRENT_TERM } from '@stex-react/utils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!checkIfPostOrSetError(req, res)) return;
  const user = await getUserInfo(req);
  const userId = user?.userId;
  if (!userId) return res.status(403).send('User info not available');

  const courseId = req.query.courseId as string;
  let instanceId = req.query.instanceId as string;
  if (!instanceId) instanceId = CURRENT_TERM;
  const sbCourseId = getSbCourseId(courseId, instanceId);

  const {
    intro,
    studyProgram,
    email,
    semester,
    meetType,
    languages,
    dayPreference,
  } = req.body as StudyBuddy;

  const active = true;

  let results = undefined;

  results = await executeAndEndSet500OnError(
    'REPLACE INTO StudyBuddyUsers (userName, intro, studyProgram, email, semester, meetType, languages, dayPreference, active, userId, sbCourseId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      user.fullName,
      intro,
      studyProgram,
      email,
      semester,
      meetType,
      languages,
      dayPreference,
      active,
      userId,
      sbCourseId,
    ],
    res
  );

  if (!results) return;
  res.status(204).end();
}
