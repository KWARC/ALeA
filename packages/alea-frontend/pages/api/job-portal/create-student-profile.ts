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
  const parsedGpa = gpa ? Number(gpa) : null;
  const result = await executeAndEndSet500OnError(
    `INSERT INTO studentProfile 
      (name,userId, resumeUrl, email,gpa, mobile,altMobile, programme, yearOfAdmission, yearOfGraduation, 
        courses,location, about) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,     [
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
