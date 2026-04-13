import { NextApiRequest, NextApiResponse } from 'next';
import { readFile } from 'fs/promises';
import path from 'path';
import { MatchReportData } from '@alea/spec';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MatchReportData | string>
) {
  try {
    const videoToSlidesMapDir = process.env.VIDEO_TO_SLIDES_MAP_DIR;

    if (!videoToSlidesMapDir) {
      throw new Error('VIDEO_TO_SLIDES_MAP_DIR environment variable not set');
    }

    const dataPath = path.join(videoToSlidesMapDir, 'all_detailed_match_reports.json');
    const fileData = await readFile(dataPath, 'utf-8');
    const data: MatchReportData = JSON.parse(fileData);

    res.status(200).json(data);
  } catch (error) {
    console.error('Error loading video match report data:', error);
    res.status(500).send('Failed to load video match report data');
  }
}