import { NextApiRequest, NextApiResponse } from 'next';
import { readdir } from 'fs/promises';

export interface CheatSheetFile {
  filename: string;
  universityId: string;
  courseId: string;
  instanceId: string;
  quizId?: string;
  userId: string;
  checksum: string;
  /** Public URL the client can open / download */
  url: string;
}

export interface CheatSheetsResponse {
  files: CheatSheetFile[];
}

/**
 * Filename conventions supported:
 *   4-segment: {universityId}_{courseId}_{instanceId}_{userId}_{checksum}.pdf
 *   5-segment: {universityId}_{courseId}_{instanceId}_{quizId}_{userId}_{checksum}.pdf
 *
 * Required query params:
 *   - instanceId: filter by course instance
 *   - userId (optional): if omitted, returns all files for the instance (instructor view)
 */
function parseFilename(filename: string): Omit<CheatSheetFile, 'url'> | null {
  if (!filename.endsWith('.pdf')) return null;
  const base = filename.slice(0, -4);
  const parts = base.split('_');

  if (parts.length < 5) return null;

  const universityId = parts[0];
  const courseId = parts[1];
  const instanceId = parts[2];
  const checksum = parts[parts.length - 1];
  const userId = parts.slice(3, parts.length - 1).join('_');

  return { filename, universityId, courseId, instanceId, userId, checksum };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheatSheetsResponse | string>
) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  const { instanceId, userId } = req.query;

  if (!instanceId || typeof instanceId !== 'string') {
    return res.status(400).send('Missing required query param: instanceId');
  }

  const cheatsheetsDir = process.env.CHEATSHEETS_DIR;
  if (!cheatsheetsDir) {
    return res.status(500).send('CHEATSHEETS_DIR environment variable not set');
  }

  try {
    const entries = await readdir(cheatsheetsDir, { withFileTypes: true });

    const files: CheatSheetFile[] = entries
      .filter((e) => e.isFile())
      .map((e) => parseFilename(e.name))
      .filter((parsed): parsed is Omit<CheatSheetFile, 'url'> => parsed !== null)
      .filter((parsed) => parsed.instanceId === instanceId)
      .filter((parsed) => (userId && typeof userId === 'string' ? parsed.userId === userId : true))
      .map((parsed) => ({
        ...parsed,
        url: `/api/cheatsheets/file?filename=${encodeURIComponent(parsed.filename)}`,
      }));

    res.status(200).json({ files });
  } catch (error) {
    console.error('Error reading cheatsheets directory:', error);
    res.status(500).send('Failed to list cheatsheet files');
  }
}