import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.JOB_PORTAL,
    Action.APPLY,
    { instanceId: CURRENT_TERM }
  );
  if (!userId) return;

  const {
    name,
    email,
    mobile,
    altMobile,
    programme,
    gpa,
    yearOfAdmission,
    yearOfGraduation,
    courses,
    location,
    about,
    resumeUrl,
  } = req.body;
  if (!name || !email) return res.status(422).end();
  const parsedGpa = gpa ? Number(gpa) : null;
  const result = await executeAndEndSet500OnError(
    `INSERT INTO studentProfile 
      (name,userId, resumeUrl, email,gpa, mobile,altMobile, programme, yearOfAdmission, yearOfGraduation, 
        courses,location, about) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      userId,
      resumeUrl,
      email,
      parsedGpa,
      mobile,
      altMobile,
      programme,
      yearOfAdmission,
      yearOfGraduation,
      courses,
      location,
      about,
    ],
    res
  );
  if (!result) return;
  res.status(201).end();
}
