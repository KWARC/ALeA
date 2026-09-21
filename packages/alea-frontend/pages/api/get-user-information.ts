import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError, getUserIdOrSetError } from './comment-utils';
import { AuthProvider, UserInformation } from '@alea/spec';

function getAuthProvider(hasPassword: boolean) {
  if (hasPassword) {
    return AuthProvider.EMAIL_PASSWORD;
  }
  return AuthProvider.FAU_IDM;
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const result = await executeAndEndSet500OnError(
    `SELECT saltedPassword is not null as hasPassword, email, showTrafficLight, showSectionReview, notificationSeenTs, isVerified FROM userInfo WHERE userId=?`,
    [userId],
    res
  );
  if (!result) return;
  if (!result[0]) {
    return res.status(200).send({
      userId,
      email: null,
      showTrafficLight: false,
      showSectionReview: true,
      notificationSeenTs: null,
      isVerified: false,
      authProvider: AuthProvider.FAU_IDM,
    } as UserInformation);
  }
  const authProvider = getAuthProvider(result[0].hasPassword);
  res.status(200).send({
    userId,
    email: result[0].email ?? null,
    showTrafficLight: result[0].showTrafficLight,
    showSectionReview: result[0].showSectionReview,
    notificationSeenTs: result[0].notificationSeenTs,
    authProvider,
    isVerified: !!result[0].isVerified,
  } as UserInformation);
}
