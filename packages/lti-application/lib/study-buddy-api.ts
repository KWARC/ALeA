import type { NextApiRequest, NextApiResponse } from 'next';
import { getLtiLaunchSession } from './lti-session';

export function getApiErrorResponse(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }

  if (typeof error === 'object' && error !== null) {
    const possibleError = error as { message?: unknown; code?: unknown; clientVersion?: unknown };
    return {
      message: typeof possibleError.message === 'string' ? possibleError.message : String(error),
      code: possibleError.code,
      clientVersion: possibleError.clientVersion,
    };
  }

  return { message: String(error) };
}

export function checkIfPostOrSetError(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).send({ message: 'Only POST requests allowed' });
    return false;
  }
  return true;
}

export function getLtiStudyBuddyScope(req: NextApiRequest, res: NextApiResponse) {
  const session = getLtiLaunchSession(req);
  if (!session) {
    res.status(403).send({ message: 'Missing or invalid LTI launch session' });
    return undefined;
  }

  const courseId = getQueryValue(req.query.courseId) || session.courseId;
  const institutionId = getQueryValue(req.query.institutionId) || session.institutionId;
  const instanceId = getQueryValue(req.query.instanceId) || session.instanceId;

  if (!institutionId || !courseId || !instanceId) {
    res.status(422).end('Missing required field: institutionId or courseId or instanceId');
    return undefined;
  }

  return {
    session,
    scope: {
      userId: session.userId,
      courseId,
      institutionId,
      instanceId,
    },
  };
}

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
