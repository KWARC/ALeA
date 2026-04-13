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
    courses,
    gpa,
    yearOfAdmission,
    yearOfGraduation,
    location,
    resumeUrl,
    socialLinks,
    about,
  } = req.body;
  const result = await executeAndEndSet500OnError(
    `UPDATE studentProfile 
SET name = ?, 
    email = ?, 
    mobile = ?, 
    altMobile=?,
    programme =? ,
    courses =?,
    gpa =?,
    yearOfAdmission = ?, 
    yearOfGraduation =?,
    location =? ,
resumeUrl=?,
socialLinks=?,
    about = ?
WHERE userId = ?`,
    [
      name,
      email,
      mobile,
      altMobile,
      programme,
      courses,
      gpa,
      yearOfAdmission,
      yearOfGraduation,
      location,
      resumeUrl,
      socialLinks,
      about,
      userId,
    ],
    res
  );
  if (!result) return;
  res.status(200).end();
}
