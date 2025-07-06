import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  executeDontEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { RecruiterData } from '@stex-react/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const results: RecruiterData[] = await executeDontEndSet500OnError(
    `SELECT name,userId,email,position,hasDefinedOrg,mobile,altMobile,organizationId,socialLinks,about
    FROM recruiterProfile 
    WHERE userId = ? 
    `,
    [userId],
    res
  );
  if (!results || !results.length) return;

  const recruiter = results[0];
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
