import { FTML } from '@flexiformal/ftml';
import axios, { AxiosError } from 'axios';

import {
  Excused,
  GetPreviousQuizInfoResponse,
  GetQuizResponse,
  InsertAnswerRequest,
  QuizStatsResponse,
  QuizStubInfo,
  QuizWithStatus,
} from './quiz';

export async function insertQuizResponse(
  quizId: string,
  problemId: string,
  r: FTML.ProblemResponse
): Promise<boolean> {
  const req: InsertAnswerRequest = {
    quizId,
    problemId,
    responses: r,
    browserTimestamp_ms: Date.now(),
  };
  try {
    await axios.post('/api/quiz/insert-quiz-response', req, {
      timeout: 30000, // 30 seconds
    });
    return true;
  } catch (err) {
    const error = err as Error | AxiosError;
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 410) {
        // Quiz has ended
        return false;
      }
      console.error('Error recording answer: ', error);
      alert(
        'Your responses are not being recorded. Check your internet connection and press okay to refresh.'
      );
      location.reload();
    }
    throw err;
  }
}

export async function getQuiz(quizId: string, targetUserId?: string) {
  const resp = await axios.get(`/api/quiz/get-quiz/${quizId}`, {
    params: { targetUserId },
  });
  return resp.data as GetQuizResponse;
}

export async function getQuizStats(quizId: string, courseId: string, courseTerm: string) {
  const resp = await axios.get(
    `/api/quiz/get-quiz-stats/${quizId}?courseId=${courseId}&courseTerm=${courseTerm}`
  );
  return resp.data as QuizStatsResponse;
}

export async function createQuiz(quiz: QuizWithStatus) {
  return await axios.post('/api/quiz/create-quiz', quiz);
}

export async function updateQuiz(quiz: QuizWithStatus) {
  return await axios.post('/api/quiz/update-quiz', quiz);
}

export async function deleteQuiz(quizId: string, courseId: string, courseTerm: string) {
  return await axios.post(
    '/api/quiz/delete-quiz',
    { quizId, courseId, courseTerm }
  );
}

export async function getCourseQuizList(courseId: string): Promise<QuizStubInfo[]> {
  return (await axios.get(`/api/quiz/get-course-quiz-list/${courseId}`)).data;
}

export async function getPreviousQuizInfo(courseId: string) {
  const resp = await axios.get(`/api/quiz/get-previous-quiz-info/${courseId}`);
  return resp.data as GetPreviousQuizInfoResponse;
}

export async function recorrectQuiz(
  quizId: string,
  courseId: string,
  courseTerm: string,
  dryRun: boolean,
  reasons: Record<string, string>
) {
  const response = await axios.post(
    '/api/quiz/recorrect',
    {
      quizId,
      courseId,
      courseTerm,
      dryRun,
      reasons,
    }
  );
  return response.data;
}

export async function createExcused(
  quizId: string,
  userId: string,
  courseId: string,
  courseInstance: string,
  institutionId: string
) {
  return await axios.post(
    '/api/quiz/create-excused',
    { userId, quizId, courseId, courseInstance, institutionId }
  );
}

export async function getExcused(quizId: string, courseId: string, courseInstance: string) {
  const resp = await axios.get(
    `/api/quiz/get-excused-students?quizId=${quizId}&courseId=${courseId}&courseInstance=${courseInstance}`,
   
  );
  return resp.data as string[];
}

export async function deleteExcused(quiz: Excused) {
  return await axios.post('/api/quiz/delete-excused', quiz);
}

export async function generateEndSemesterSummary(
  courseId: string,
  courseTerm: string,
  excludeQuizzes: string[] = [],
  topN: number
) {
  const response = await axios.post(
    '/api/quiz/end-semester-summary',
    {
      courseId,
      courseTerm,
      excludeQuizzes,
      topN,
    }
  );
  return response.data;
}

export async function checkPendingRecorrections() {
  const response = await axios.post(
    '/api/quiz/recorrect-all',
    {}
  );

  return response.data;
}

export async function getAllQuizzes(courseId: string, courseTerm: string) {
  const resp = await axios.get(
    `/api/quiz/get-all-quizzes?courseId=${courseId}&courseTerm=${courseTerm}`
  );
  return resp.data;
}
