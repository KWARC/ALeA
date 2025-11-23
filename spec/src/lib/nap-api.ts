import { FTML } from '@flexiformal/ftml';
import { CURRENT_TERM } from '@alea/utils';
import axios, { AxiosError } from 'axios';
import { HomeworkInfo } from './homework';
import { getAuthHeaders } from './lmp';
import {
  AnswerResponse,
  CreateAnswerRequest,
  CreateGradingRequest,
  CreateReviewRequest,
  GradingInfo,
  GradingItem,
  GradingWithAnswer,
} from './nap';

export async function createAnswer(answer: CreateAnswerRequest) {
  try {
    await axios.post('/api/nap/create-answer', answer, { headers: getAuthHeaders() });
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

export async function createGrading(grading: CreateGradingRequest) {
  return await axios
    .post('/api/nap/create-grading', grading, { headers: getAuthHeaders() })
    .then((c) => ({ status: c.status, data: c.data as number }));
}

export async function createReviewRequest(request: CreateReviewRequest) {
  return axios
    .post('/api/nap/create-review-request', request, { headers: getAuthHeaders() })
    .then((c) => ({ status: c.status }));
}

export async function getReviewRequests(courseId: string) {
  return axios
    .get('/api/nap/get-review-requests', {
      headers: getAuthHeaders(),
      params: { courseId, courseInstance: CURRENT_TERM },
    })
    .then((c) => c.data);
}

export async function getAnswerWithReviewRequestId(id: number) {
  return axios
    .get('/api/nap/get-answer-with-review-id', {
      headers: getAuthHeaders(),
      params: { id: id },
    })
    .then((c) => c.data);
}

export async function deleteAnswer(id: number) {
  return axios.post('/api/nap/delete-answer', { id }, { headers: getAuthHeaders() });
}
export async function deleteGraded(id: number) {
  return axios.post('/api/nap/delete-grade', { id }, { headers: getAuthHeaders() });
}

export async function deleteReviewRequest(id: number) {
  return axios.post('/api/nap/delete-review-request', { id }, { headers: getAuthHeaders() });
}

export interface GetAnswersWithGradingResponse {
  answers: FTML.ProblemResponse | undefined;
  subProblemIdToAnswerId: Record<string, number>;
  subProblemIdToGrades: Record<string, GradingInfo[]>; // subProblemId -> gradingInfo[]
}

export async function getAnswersWithGrading(
  homeworkId: number,
  questionId: string,
  studentId: string,
  answerId: number,
  courseId: string
) {
  return axios
    .get('/api/nap/get-answers-with-grading', {
      params: {
        homeworkId,
        questionId,
        studentId,
        answerId,
        courseId,
        courseInstance: CURRENT_TERM,
      },
      headers: getAuthHeaders(),
    })
    .then((c) => c.data as GetAnswersWithGradingResponse);
}
export async function getAnswerAdmin(courseId: string, answerId: number) {
  return axios.get('/api/nap/admin/get-answer', {
    params: {
      courseId,
      answerId,
    },
    headers:getAuthHeaders()
  }).then(c=>c.data);
}
export async function getAnswerInfo(answerId: number, courseId: string, questionId: string) {
  return axios
    .get('/api/nap/get-answers-info', {
      params: {
        answerId,
        courseId,
        courseInstance: CURRENT_TERM,
        questionId,
      },
      headers: getAuthHeaders(),
    })
    .then((c) => c.data as { subProblemId: string });
}

export interface GetCourseGradingItemsResponse {
  gradingItems: GradingItem[];
  homeworks: HomeworkInfo[];
}

export async function getCourseGradingItems(courseId: string) {
  const resp = await axios.get('/api/nap/get-course-grading-items', {
    params: { courseId },
    headers: getAuthHeaders(),
  });
  return resp.data as GetCourseGradingItemsResponse;
}
export async function getMyAnswers() {
  return (
    await axios.get<AnswerResponse[]>('/api/nap/get-my-answers', { headers: getAuthHeaders() })
  ).data;
}
export async function getMyGraded() {
  return (
    await axios.get<GradingWithAnswer[]>('/api/nap/get-my-graded', { headers: getAuthHeaders() })
  ).data;
}
export async function getGradingItems(answerId: number, subProblemId: number) {
  return (
    await axios.get<GradingInfo[]>('/api/nap/get-answer-grading', {
      params: { answerId, subProblemId },
      headers: getAuthHeaders(),
    })
  ).data;
}
export async function getReviewItems(courseId: string) {
  return (
    await axios.get<GradingWithAnswer[]>('/api/nap/admin/get-peer-review-items', {
      params: { courseId },
      headers: getAuthHeaders(),
    })
  ).data;
}
export async function deleteReview(id: number, courseId: string) {
  return axios.get('/api/nap/admin/delete-peer-review', {
    headers: getAuthHeaders(),
    params: { id, courseId },
  });
}
