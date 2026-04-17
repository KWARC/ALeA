import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName, WeekdayName, WEEKDAYS } from '@alea/utils';
import { CheatsheetConfig } from '@alea/spec';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { courseId, instanceId, config } = req.body as {
    courseId: string;
    instanceId: string;
    config: Partial<CheatsheetConfig>;
  };
  if (!courseId || !instanceId || !config || typeof config !== 'object') {
    return res.status(422).end('Missing required fields: courseId, instanceId, config');
  }
  if (config.uploadStartDay && !WEEKDAYS.includes(config.uploadStartDay as WeekdayName)) {
    return res.status(422).end('uploadStartDay must be a valid day name');
  }
  if (config.uploadEndDay && !WEEKDAYS.includes(config.uploadEndDay as WeekdayName)) {
    return res.status(422).end('uploadEndDay must be a valid day name');
  }
  // Validate time format (HH:MM) if provided
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (config.uploadStartTime && !timeRegex.test(config.uploadStartTime)) {
    return res.status(422).end('uploadStartTime must be in HH:MM format (24-hour)');
  }
  if (config.uploadEndTime && !timeRegex.test(config.uploadEndTime)) {
    return res.status(422).end('uploadEndTime must be in HH:MM format (24-hour)');
  }

  const updaterId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_METADATA,
    Action.MUTATE,
    { courseId, instanceId }
  );
  if (!updaterId) return;

  const existing = await executeAndEndSet500OnError(
    `SELECT cheatsheetConfig FROM courseMetadata WHERE courseId = ? AND instanceId = ?`,
    [courseId, instanceId],
    res
  );

  const currentConfig = existing?.[0]?.cheatsheetConfig
    ? typeof existing[0].cheatsheetConfig === 'string'
      ? JSON.parse(existing[0].cheatsheetConfig)
      : existing[0].cheatsheetConfig
    : {};

  const updatedConfig: CheatsheetConfig = {
    ...currentConfig,
    ...config,
  };

  if (!existing?.length) {
    await executeAndEndSet500OnError(
      `INSERT INTO courseMetadata (
        courseId, instanceId, lectureSchedule, cheatsheetConfig,
        hasHomework, hasQuiz, updaterId
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [courseId, instanceId, JSON.stringify([]), JSON.stringify(updatedConfig), 0, 0, updaterId],
      res
    );
    return res.status(201).json({ success: true });
  }

  await executeAndEndSet500OnError(
    `UPDATE courseMetadata
     SET cheatsheetConfig = ?, updaterId = ?, updatedAt = CURRENT_TIMESTAMP
     WHERE courseId = ? AND instanceId = ?`,
    [JSON.stringify(updatedConfig), updaterId, courseId, instanceId],
    res
  );

  return res.status(200).json({ success: true });
}
