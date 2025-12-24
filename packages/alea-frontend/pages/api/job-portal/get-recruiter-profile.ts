import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  executeDontEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { RecruiterData } from '@alea/spec';

export async function getRecruiterProfileByUserIdOrSet500OnError(userId: string, res: NextApiResponse){
  const results: RecruiterData[] = await executeDontEndSet500OnError(
    `SELECT name,userId,email,position,mobile,altMobile,organizationId,socialLinks,about
     FROM recruiterProfile 
     WHERE userId = ? 
     `,
    [userId],
    res
  );
  if (!results) return;
  if (!results.length){
     res.status(404).end();
     return;
  }
  return results[0];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const results: RecruiterData[] = await executeDontEndSet500OnError(
    `SELECT name,userId,email,position,mobile,altMobile,organizationId,socialLinks,about
    FROM recruiterProfile 
    WHERE userId = ? 
    `,
    [userId],
    res
  );
  if (!results) return;
  if (!results.length)return res.status(404).end();

  const recruiter = await getRecruiterProfileByUserIdOrSet500OnError(userId,res);
  if(!recruiter) return;
  let parsedSocialLinks: Record<string, string> = {};

  if (typeof recruiter.socialLinks === 'string') {
    parsedSocialLinks = JSON.parse(recruiter.socialLinks);
  } else {
    parsedSocialLinks = recruiter.socialLinks || {};
  }

  res.status(200).json({
    ...recruiter,
    socialLinks: parsedSocialLinks,
  });
}
