import axios from 'axios';
import {
  CompletionEval,
  CreateGptProblemsRequest,
  CreateGptProblemsResponse,
  GptRun,
  Template,
} from './gpt-problems';
import { getAuthHeaders } from './lmp';

export async function createGptQuestions(request: CreateGptProblemsRequest) {
  const resp = await axios.post(`/api/gpt-redirect?apiname=create-problems`, request, {
    headers: getAuthHeaders(),
  });
  return resp.data as CreateGptProblemsResponse;
}

export async function getTemplates() {
  const resp = await axios.get(`/api/gpt-redirect?apiname=get-templates`, {
    headers: getAuthHeaders(),
  });
  return resp.data as Template[];
}

export async function getTemplateVersions(templateName: string) {
  const resp = await axios.get(`/api/gpt-redirect?apiname=get-template-versions/${templateName}`, {
    headers: getAuthHeaders(),
  });
  return resp.data as Template[];
}

export async function saveTemplate(template: Template) {
  const resp = await axios.post(`/api/gpt-redirect?apiname=save-template`, template, {
    headers: getAuthHeaders(),
  });
  return resp.data as Template;
}

export async function getGptRuns() {
  const resp = await axios.get(`/api/gpt-redirect?apiname=get-runs`, {
    headers: getAuthHeaders(),
  });
  return resp.data as GptRun[];
}

export async function saveEval(evaluation: CompletionEval) {
  const resp = await axios.post(`/api/gpt-redirect?apiname=save-eval`, evaluation, {
    headers: getAuthHeaders(),
  });
  return resp.data as GptRun;
}

export async function getEval(runId: string, completionIdx: number) {
  const resp = await axios.get(`/api/gpt-redirect?apiname=get-eval/${runId}/${completionIdx}`, {
    headers: getAuthHeaders(),
  });
  return resp.data as CompletionEval;
}

export interface GptSearchResult {
  archive: string;
  filepath: string;
  courseId: string;
  uri: string;
}

export async function searchCourseNotes(query: string, courseId: string) {
  const encodedQuery = encodeURIComponent(query);
  const resp = await axios.get(
    `/api/gpt-redirect?query=${encodedQuery}&course_id=${courseId}&apiname=query_metadata`,
    {
      headers: getAuthHeaders(),
    }
  );
  return resp.data as { sources: GptSearchResult[] };
}
export type QuizQuestionType = 'mcq' | 'msq' | 'fill';
export interface QuizQuestion {
  question: string;
  options?: string[];
  questionType: QuizQuestionType;
  correctAnswer?: string | string[];
  explanation?: string;
}
interface QuizResponse {
  quiz: QuizQuestion[];
}
export async function generateQuizProblems(
  courseId: string,
  sectionId: string,
  sectionUri: string
) {
  const resp = await axios.post(
    `/api/gpt-redirect?apiname=generate-quiz-problems`,
    { courseId, sectionId, sectionUri },
    {
      headers: getAuthHeaders(),
    }
  );
  return resp.data as QuizResponse;
}
