import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const quizDir = process.env.OLD_QUIZ_DIR;
  const { semester } = req.query as { semester?: string };
  if (!quizDir || !semester) return res.status(400).json({ error: 'Missing parameters' });

  const semesterPath = path.join(quizDir, semester);
  try {
    const files = fs.readdirSync(semesterPath).filter((name) => name.endsWith('.json'));
    res.status(200).json(files);
  } catch (e) {
    res.status(500).json({ error: 'Failed to read files' });
  }
}
