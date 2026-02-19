import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { courseId } = req.query as { courseId?: string };

  if (!courseId) {
    res.status(422).json({ error: 'Missing required field: courseId' });
    return;
  }

  try {
    const syllabusDir = process.env.RECORDED_SYLLABUS_DIR;
    const filePath = path.join(syllabusDir, 'current-sem.json');

    let hasEntries = false;
    let count = 0;

    if (fs.existsSync(filePath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(filePath, 'utf8')) || {};
        const courseData = existing[courseId];
        if (courseData?.lectures && Array.isArray(courseData.lectures)) {
          hasEntries = courseData.lectures.length > 0;
          count = courseData.lectures.length;
        }
      } catch (e) {
        console.error('Failed to read existing file:', e);
      }
    }

    res.status(200).json({
      courseId,
      hasEntries,
      count,
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
