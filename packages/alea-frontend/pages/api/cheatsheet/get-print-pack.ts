import type { NextApiRequest, NextApiResponse } from 'next';
import { getPrintPackDir, readPrintPackManifest } from '@alea/node-utils';
import { Action, ResourceName } from '@alea/utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfGetOrSetError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const { universityId, courseId, instanceId } = req.query;
  if (
    typeof universityId !== 'string' ||
    typeof courseId !== 'string' ||
    typeof instanceId !== 'string' ||
    !universityId ||
    !courseId ||
    !instanceId
  ) {
    return res.status(422).send('Missing or invalid parameters');
  }
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_CHEATSHEET,
    Action.MUTATE,
    { courseId, instanceId }
  );
  if (!userId) return;

  const cheatsheetsDir = process.env.CHEATSHEETS_DIR;
  if (!cheatsheetsDir) return res.status(500).send('CHEATSHEETS_DIR is not configured.');

  const packDir = getPrintPackDir(cheatsheetsDir, universityId, courseId, instanceId);
  const manifest = readPrintPackManifest(packDir);
  if (!manifest) return res.status(404).send('No print pack found');
  return res.status(200).json(manifest);
}
