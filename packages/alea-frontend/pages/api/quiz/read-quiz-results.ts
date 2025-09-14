import { QuizResult } from '@alea/spec';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const filePath = process.env.QUIZ_RESULTS_FILE;

  // Read the existing file data, if it exists
  let existingData: QuizResult[] = [];
  if (fs.existsSync(filePath)) {
    const fileData = fs.readFileSync(filePath, 'utf-8');
    existingData = JSON.parse(fileData);
  }

  res.status(200).json({ data: existingData });
}
