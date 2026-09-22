import { NextApiRequest, NextApiResponse } from 'next';
import {
  executeAndEndSet500OnError,
  findUserInfoRowForLms,
  getJwtUserInfo,
  getUserId,
  isCdiCampusRowProvisioned,
  rowHasPassword,
  upsertUnverifiedUserStub,
} from './comment-utils';
import { AuthProvider, UserInformation } from '@alea/spec';
import { isCdiAuthEnabled } from '@alea/utils';

function getAuthProvider(saltedPassword: unknown) {
  if (rowHasPassword(saltedPassword)) {
    return AuthProvider.EMAIL_PASSWORD;
  }
  return AuthProvider.FAU_IDM;
}

function pendingPayload(): UserInformation {
  return {
    userId: '',
    email: null,
    firstName: null,
    lastName: null,
    showTrafficLight: false,
    showSectionReview: true,
    notificationSeenTs: null as unknown as number,
    isVerified: false,
    authProvider: AuthProvider.FAU_IDM,
    cdiEmailPending: true,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (isCdiAuthEnabled()) {
    const jwtInfo = await getJwtUserInfo(req);
    if (!jwtInfo?.authKind) {
      return res.status(403).send({ message: 'Could not get userId' });
    }
    if (jwtInfo.authKind === 'cdi') {
    const row = await findUserInfoRowForLms(jwtInfo);
    if (!row || !isCdiCampusRowProvisioned(row, jwtInfo.cdiId ?? '')) {
      if (!row && jwtInfo.cdiId && !(await upsertUnverifiedUserStub(jwtInfo.cdiId, res))) return;
      if (row && row.cdiId === jwtInfo.cdiId) {
        return res.status(200).send({
          userId: row.userId,
          email: row.email ?? null,
          firstName: null,
          lastName: null,
          showTrafficLight: false,
          showSectionReview: true,
          notificationSeenTs: null,
          isVerified: false,
          authProvider: AuthProvider.FAU_IDM,
          cdiEmailPending: true,
        } as UserInformation);
      }
      return res.status(200).send(pendingPayload());
    }
    const result = await executeAndEndSet500OnError(
      `SELECT saltedPassword, email, firstName, lastName, showTrafficLight, showSectionReview, notificationSeenTs, isVerified FROM userInfo WHERE userId=?`,
      [row.userId],
      res
    );
    if (!result) return;
    if (!result[0]) return res.status(200).send(pendingPayload());
    const authProvider = getAuthProvider(result[0].saltedPassword);
    return res.status(200).send({
      userId: row.userId,
      email: result[0].email ?? null,
      firstName: result[0].firstName ?? null,
      lastName: result[0].lastName ?? null,
      showTrafficLight: result[0].showTrafficLight,
      showSectionReview: result[0].showSectionReview,
      notificationSeenTs: result[0].notificationSeenTs,
      authProvider,
      isVerified: !!result[0].isVerified,
      cdiEmailPending: false,
    } as UserInformation);
    }
  }

  const userId = await getUserId(req);
  if (!userId) {
    return res.status(403).send({ message: 'Could not get userId' });
  }
  const result = await executeAndEndSet500OnError(
    `SELECT saltedPassword, email, firstName, lastName, showTrafficLight, showSectionReview, notificationSeenTs, isVerified FROM userInfo WHERE userId=?`,
    [userId],
    res
  );
  if (!result) return;
  if (!result[0]) {
    return res.status(200).send({
      userId,
      email: null,
      firstName: null,
      lastName: null,
      showTrafficLight: false,
      showSectionReview: true,
      notificationSeenTs: null,
      isVerified: false,
      authProvider: AuthProvider.FAU_IDM,
    } as UserInformation);
  }
  const authProvider = getAuthProvider(result[0].saltedPassword);
  res.status(200).send({
    userId,
    email: result[0].email ?? null,
    firstName: result[0].firstName ?? null,
    lastName: result[0].lastName ?? null,
    showTrafficLight: result[0].showTrafficLight,
    showSectionReview: result[0].showSectionReview,
    notificationSeenTs: result[0].notificationSeenTs,
    authProvider,
    isVerified: !!result[0].isVerified,
  } as UserInformation);
}
