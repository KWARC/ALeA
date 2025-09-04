import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError, getUserIdOrSetError } from './comment-utils';
import { AuthProvider, UserInformation } from '@stex-react/spec';

//This  method for finding authProvider is brittle.we should store the information in the database at the time of signup
function getAuthProvider(hasPassword: boolean) {
  if (hasPassword) {
    return AuthProvider.EMAIL_PASSWORD;
  }
  return AuthProvider.FAU_IDM;
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const result: UserInformation = await executeAndEndSet500OnError(
    `SELECT saltedPassword is not null as hasPassword, showTrafficLight, showSectionReview, notificationSeenTs, isVerified FROM userInfo WHERE userId=?`,
    [userId],
    res
  );
  if (!result) return;
  if (!result[0]) {
    return res.status(200).send({
      showTrafficLight: false,
      showSectionReview: true,
      notificationSeenTs: null,
      isVerified: false,
    });
  }
  const authProvider = getAuthProvider(result[0].hasPassword);
  res.status(200).send({
    showTrafficLight: result[0].showTrafficLight,
    showSectionReview: result[0].showSectionReview,
    notificationSeenTs: result[0].notificationSeenTs,
    isVerified: authProvider === AuthProvider.EMAIL_PASSWORD ? result[0].isVerified : true,
  });
}
