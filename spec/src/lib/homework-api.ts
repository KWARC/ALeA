import axios from 'axios';
import { FTML } from '@flexiformal/ftml';
import { HomeworkInfo, HomeworkPhase, HomeworkStatsInfo, HomeworkStub } from './homework';
import { GradingInfo } from './nap';

export async function getHomeworkList(courseId: string) {
  const resp = await axios.get(`/api/homework/get-homework-list?courseId=${courseId}`);
  return resp.data as HomeworkStub[];
}
export async function getHomeworkStats(courseId: string, homeworkId: string) {
  const resp = await axios.get(`/api/homework/get-homework-stats`, {
    params: { courseId, homeworkId },
  });
  return resp.data as HomeworkStatsInfo;
}

export function getHomeworkPhase(homework: HomeworkInfo): HomeworkPhase {
  const now = new Date();
  if (now < new Date(homework.givenTs)) return 'NOT_GIVEN';
  if (now < new Date(homework.dueTs)) return 'GIVEN';
  if (now < new Date(homework.feedbackReleaseTs)) return 'SUBMISSION_CLOSED';
  return 'FEEDBACK_RELEASED';
}

export interface GetHomeworkResponse {
  homework: HomeworkInfo;
  responses: Record<string, ResponseWithSubProblemId>;
  gradingInfo: Record<string, Record<string, GradingInfo[]>>;
}
export interface ResponseWithSubProblemId {
  problemId: string;
  responses: { subProblemId: string; answer: string }[];
}

export async function getHomework(id: number) {
  const resp = await axios.get(`/api/homework/get-homework?id=${id}`);
  return resp.data as GetHomeworkResponse;
}

export type CreateHomeworkRequest = Omit<HomeworkInfo, 'id' | 'updaterId'>;
export async function createHomework(data: CreateHomeworkRequest) {
  return axios.post('/api/homework/create-homework', data);
}

export type UpdateHomeworkRequest = Omit<HomeworkInfo, 'courseId' | 'courseInstance' | 'institutionId' | 'updaterId'>;
export async function updateHomework(data: UpdateHomeworkRequest) {
  return axios.post('/api/homework/update-homework', data);
}

export async function deleteHomework(id: number, courseId: string) {
  const response = await axios.post(
    '/api/homework/delete-homework',
    { id, courseId }  );
  return response.data;
}
