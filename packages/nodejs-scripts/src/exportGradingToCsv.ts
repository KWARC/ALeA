import { getAllQuizzes } from '@alea/node-utils';
import { QuizWithStatus } from '@alea/spec';
import fs from 'fs';
import path from 'path';
import { exit } from 'process';
import mysql from 'serverless-mysql';
import * as csv from 'fast-csv';

const db = mysql({
  config: {
    host: process.env.MYSQL_HOST,
    port: +process.env.MYSQL_PORT,
    database: process.env.MYSQL_GRADING_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
  },
});

interface GradingRecord {
  courseId: string;
  instanceId: string;
  quizId: string;
  userId: string;
  points: number;
  problemId: string;
}


export async function exportGradingToCsv() {
  if (!process.env.QUIZ_INFO_DIR || !process.env.QUIZ_LMS_INFO_FILE) {
    console.log(`Env vars not set. Set them at [nodejs-scripts/.env.local] Exiting.`);
    exit(1);
  }

  try {
    // Query all grading records for the specified course
    const gradingRecords = await db.query<GradingRecord[]>(
      `SELECT courseId, instanceId, quizId, userId, problemId, points 
      FROM grading
      WHERE (quizId, userId, problemId, browserTimestamp_ms) IN (
        SELECT quizId, userId, problemId, MAX(browserTimestamp_ms) AS browserTimestamp_ms
        FROM grading
        WHERE courseId IN (?) AND instanceId IN (?) 
        GROUP BY quizId, userId, problemId
      )
      GROUP BY userId, quizId, problemId, points, courseId, instanceId
      ORDER BY courseId, instanceId, quizId, userId, problemId`,
      [['ai-1', 'ai-2'], ['WS24-25', 'SS25']]
    );
    console.log(`Found ${gradingRecords.length} grading records for AI-1 course`);

    // Get all quizzes to include quiz titles in the export
    const quizzes: QuizWithStatus[] = getAllQuizzes();
    const quizMap = new Map<string, QuizWithStatus>();
    for (const quiz of quizzes) {
      quizMap.set(quiz.id, quiz);
    }

    // Prepare data for CSV
    const csvData = gradingRecords.map(record => {
      const { courseId, instanceId, quizId, userId, problemId, points } = record;
      const quiz = quizMap.get(quizId);
      return {
        courseId,
        instanceId,
        quizId,
        userId,
        problemId,
        points,
         //recorrections: !!quiz?.recorrectionInfo?.some(r=>r.problemUri === problemId),
      };
    });

    // Write to CSV file
    const outputPath = path.join(process.cwd(), 'grading-export.csv');
    const writeStream = fs.createWriteStream(outputPath);
    csv.write(csvData, { headers: true })
      .pipe(writeStream)
      .on('finish', () => {
        console.log(`CSV export completed. File saved at: ${outputPath}`);
        db.end();
        process.exit(0);
      });

  } catch (error) {
    console.error('Error during export:', error);
    await db.end();
    process.exit(1);
  }
}
