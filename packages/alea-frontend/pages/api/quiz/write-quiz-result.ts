import { QuizResult } from '@alea/spec';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const quizResult = req.body as QuizResult;
  const filePath = process.env.QUIZ_RESULTS_FILE;

  // Read the existing file data, if it exists
  let existingData: QuizResult[] = [];
  if (fs.existsSync(filePath)) {
    const fileData = fs.readFileSync(filePath, 'utf-8');
    existingData = JSON.parse(fileData);
  }

  // Append the new object to the existing data
  const newData = [...existingData, quizResult];

  // Write the updated data back to the file
  fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));

  res.status(200).json({ message: 'Object appended successfully!' });
}
