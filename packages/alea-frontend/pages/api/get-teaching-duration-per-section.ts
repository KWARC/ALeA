import fs from 'fs/promises';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

const VIDEO_DIR = process.env.VIDEO_TO_SLIDES_MAP_DIR || 'data/slides';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { courseId } = req.query;

  if (typeof courseId !== 'string') {
    return res.status(422).json({ error: 'Missing or invalid courseId' });
  }

  try {
    const files = await fs.readdir(VIDEO_DIR);
    const semesterFiles = files.filter(file =>
      file.startsWith(`${courseId}_`) && file.endsWith('_updated_extracted_content.json')
    );

    const responseData: Record<string, { sectionDurations: any, slideDurations: any }> = {};

    for (const file of semesterFiles) {
      const semesterMatch = file.match(/^.+_(.+)_updated_extracted_content\.json$/);
      if (!semesterMatch) continue;

      const semester = semesterMatch[1];
      const filePath = path.join(VIDEO_DIR, file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      const sectionDurations: Record<string, number> = {};
      const slideDurations: Record<string, number> = {};

      for (const clipId in data) {
        const clip = data[clipId];
        if (!clip.extracted_content) continue;

        for (const ts in clip.extracted_content) {
          const entry = clip.extracted_content[ts];
          const duration = entry.duration;
          if (typeof duration !== 'number') continue;

          const sectionUri = entry.sectionUri;
          const slideUri = entry.slideUri;

          if (sectionUri) {
            sectionDurations[sectionUri] = (sectionDurations[sectionUri] || 0) + duration;
          }
          if (slideUri) {
            slideDurations[slideUri] = (slideDurations[slideUri] || 0) + duration;
          }
        }
      }

      responseData[semester] = { sectionDurations, slideDurations };
    }

    return res.status(200).json(responseData);
  } catch (err) {
    console.error(`[ERROR] Failed to process teaching duration for ${courseId}:`, err);
    return res.status(500).json({ error: 'Could not read duration files' });
  }
}
