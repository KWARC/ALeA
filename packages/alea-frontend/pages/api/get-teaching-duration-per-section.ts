import fs from 'fs/promises';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

const VIDEO_DIR = process.env.VIDEO_TO_SLIDES_MAP_DIR || 'data/slides';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { courseId } = req.query;

  if (typeof courseId !== 'string') {
    return res.status(422).json({ error: 'Missing or invalid courseId' });
  }

  const filePath = path.join(VIDEO_DIR, `${courseId}_updated_extracted_content.json`);
  const sectionDurations: Record<string, number> = {};
  const slideDurations: Record<string, number> = {};

  try {
    const file = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(file);

    for (const clipId in data) {
      const clip = data[clipId];
      if (!clip.extracted_content) continue;

      for (const ts in clip.extracted_content) {
        const entry = clip.extracted_content[ts];
        const sectionUri = entry.sectionUri;
        const slideUri = entry.slideUri;
        const duration = entry.duration;
        if (typeof duration === 'number') {
          if (sectionUri) {
            sectionDurations[sectionUri] = (sectionDurations[sectionUri] || 0) + duration;
          }
          if (slideUri) {
            slideDurations[slideUri] = (slideDurations[slideUri] || 0) + duration;
          }
        }
      }
    }

    return res.status(200).json({ sectionDurations, slideDurations });
  } catch (err) {
    console.error(`[ERROR] Failed to read durations for ${courseId}:`, err);
    return res.status(500).json({ error: 'Could not read duration file' });
  }
}
