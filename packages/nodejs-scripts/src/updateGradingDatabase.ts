import { getAllQuizzes } from '@alea/node-utils';
import { QuizWithStatus } from '@alea/spec';
import fs from 'fs';
import path from 'path';
import { exit } from 'process';
import mysql from 'serverless-mysql';

const DRY_RUN = true;

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
  gradingId: number;
  quizId: string;
  courseId: string;
  instanceId: string;
}
function getOldQuizzes(semester: string) {
  const quizDir = process.env.OLD_QUIZ_DIR;
  if (!quizDir || !semester) return [];
  const semesterPath = path.join(quizDir, semester);
  try {
    const files = fs
      .readdirSync(semesterPath)
      .filter((name) => name.endsWith('.json') && !name.startsWith('_bkp'));
    return files.map((file) => {
      const quiz = JSON.parse(
        fs.readFileSync(path.join(semesterPath, file), 'utf8')
      ) as QuizWithStatus;
      return quiz;
    });
  } catch (error) {
    console.error(`Error getting old quizzes for semester ${semester}:`, error);
    return [];
  }
}

export async function updateGradingDatabase() {
  if (!process.env.QUIZ_INFO_DIR || !process.env.QUIZ_LMS_INFO_FILE) {
    console.log(`Env vars not set. Set them at [nodejs-scripts/.env.local] Exiting.`);
    exit(1);
  }

  if (DRY_RUN) {
    console.log('=== DRY RUN MODE: No database updates will be performed ===\n');
  }

  try {
    // Get all quizzes and create a map by quizId
    const quizzes: QuizWithStatus[] = getAllQuizzes();
    const quizMap = new Map<string, QuizWithStatus>();
    for (const quiz of quizzes) {
      quizMap.set(quiz.id, quiz);
    }
    console.log(`Loaded ${quizzes.length} quizzes from getAllQuizzes()`);

    // Also load old quizzes from specified semesters
    const oldSemesters = ['SS24', 'WS23-24', 'WS24-25'];
    let oldQuizCount = 0;
    for (const semester of oldSemesters) {
      const oldQuizzes = getOldQuizzes(semester);
      for (const quiz of oldQuizzes) {
        // Only add if not already in map (current quizzes take precedence)
        if (!quizMap.has(quiz.id)) {
          quizMap.set(quiz.id, quiz);
          oldQuizCount++;
        }
      }
      console.log(`Loaded ${oldQuizzes.length} old quizzes from ${semester}`);
    }
    console.log(
      `Total quizzes in map: ${quizMap.size} (${quizzes.length} current + ${oldQuizCount} old)`
    );

    // Query all grading records
    const gradingRecords = await db.query<GradingRecord[]>(
      'SELECT gradingId, quizId, courseId, instanceId FROM grading'
    );
    console.log(`Found ${gradingRecords.length} grading records`);

    // Update records that need courseId/instanceId populated
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const record of gradingRecords) {
      const quiz = quizMap.get(record.quizId);

      if (!quiz) {
        console.warn(
          `Quiz not found for quizId: ${record.quizId} (gradingId: ${record.gradingId})`
        );
        skippedCount++;
        continue;
      }

      // Check if update is needed
      if (record.courseId === quiz.courseId && record.instanceId === quiz.courseTerm) {
        // Already correct, skip
        continue;
      }

      // Update the record
      if (DRY_RUN) {
        // In dry run mode, just count what would be updated
        updatedCount++;
      } else {
        try {
          await db.query('UPDATE grading SET courseId = ?, instanceId = ? WHERE gradingId = ?', [
            quiz.courseId,
            quiz.courseTerm,
            record.gradingId,
          ]);
          updatedCount++;
        } catch (error) {
          console.error(`Error updating gradingId ${record.gradingId}:`, error);
          errorCount++;
        }
      }
    }

    console.log(`\n${DRY_RUN ? 'Dry run ' : ''}Update complete:`);
    console.log(`  - ${DRY_RUN ? 'Would update' : 'Updated'}: ${updatedCount}`);
    console.log(`  - Skipped (quiz not found): ${skippedCount}`);
    if (DRY_RUN) console.log('\n=== DRY RUN MODE: No actual changes were made ===');
    else console.log(`  - Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Error in updateGradingDatabase:', error);
    throw error;
  } finally {
    // Close the database connection
    await db.end();
  }
}
