import { QuizWithStatus } from '@alea/spec';
import { FTML } from '@flexiformal/ftml';
import { getAllQuizzes } from '@alea/node-utils';
import fs from 'fs';

import { exit } from 'process';

export interface Quiz {
  problems: { [problemId: string]: string };
}

interface ProblemLmsInfo {
  total_points: number;
  preconditions: [FTML.CognitiveDimension, FTML.SymbolUri][];
  objectives: [FTML.CognitiveDimension, FTML.SymbolUri][];
  // todo add more.
}

export async function quizLmsInfoWriter() {
  const quizzes: QuizWithStatus[] = getAllQuizzes();

  if (!process.env.QUIZ_INFO_DIR || !process.env.QUIZ_LMS_INFO_FILE) {
    console.log(`Env vars not set. Set them at [nodejs-scripts/.env.local] Exiting.`);
    exit(1);
  }

  const LMSInfo: { [quizId: string]: { [problemId: string]: ProblemLmsInfo } } = {};
  for (const quiz of quizzes) {
    const quizLmsInfo: { [problemId: string]: ProblemLmsInfo } = {};
    for (const [problemUri, ftmlProblemWithSol] of Object.entries(quiz.problems)) {
      const { total_points, objectives, preconditions } = ftmlProblemWithSol.problem;
      quizLmsInfo[problemUri] = {
        total_points: total_points ?? 1,
        objectives,
        preconditions,
      };
    }
    LMSInfo[quiz.id] = quizLmsInfo;
  }

  fs.writeFileSync(process.env.QUIZ_LMS_INFO_FILE, JSON.stringify(LMSInfo, null, 2));
  console.log(`Wrote to ${process.env.QUIZ_LMS_INFO_FILE}`);
}
