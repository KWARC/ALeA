import axios from 'axios';
import {
  CompletionEval,
  CreateGptProblemsRequest,
  CreateGptProblemsResponse,
  GenerationParams,
  GptRun,
  PossibleVariantsResult,
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
  const resp = await axios.get('/api/gpt-redirect', {
    params: {
      query: encodedQuery,
      course_id: courseId,
      apiname: 'query_metadata',
      projectName: 'search',
    },
    headers: getAuthHeaders(),
  });
  return resp.data as { sources: GptSearchResult[] };
}

export type QuizProblemType = 'MCQ' | 'MSQ' | 'FILL_IN';
interface OptionExplanations {
  [option: string]: string;
}
export interface ProblemJson {
  problem: string;
  problemType: QuizProblemType;
  options: string[];
  optionExplanations?: OptionExplanations;
  correctAnswer: string | string[];
  explanation?: string;
}
export interface QuizProblem {
  problemId: number;
  courseId: string;
  sectionId: string; //TODO see again
  sectionUri: string;
  problemStex: string;
  problemJson: ProblemJson;
}
export async function fetchGeneratedProblems(
  courseId: string,
  startSectionUri: string,
  endSectionUri: string
) {
  const resp = await axios.get(`/api/gpt-redirect`, {
    params: {
      apiname: 'fetch-generated-problems',
      projectName: 'quiz-gen',
      courseId,
      startSectionUri,
      endSectionUri,
    },
    headers: getAuthHeaders(),
  });
  return resp.data as QuizProblem[];
}

export async function generateQuizProblems(generationParams: GenerationParams) {
  const resp = await axios.post(
    '/api/gpt-redirect',
    { generationParams },
    {
      params: {
        apiname: 'generate',
        projectName: 'quiz-gen',
      },
      headers: getAuthHeaders(),
    }
  );
  return resp.data as QuizProblem[];
}

export async function checkPossibleVariants(problemId: number) {
  const resp = await axios.post(
    '/api/gpt-redirect',
    { problemId },
    {
      params: {
        apiname: 'check-possible-variants',
        projectName: 'quiz-gen',
      },
      headers: getAuthHeaders(),
    }
  );
  return resp.data as PossibleVariantsResult;
}

export async function postFeedback(data: {
  problemId: number;
  rating: boolean;
  reasons?: string[];
  comments?: string;
}) {
  const resp = await axios.post(`/api/gpt-redirect`, data, {
    params: {
      apiname: 'post-feedback',
      projectName: 'quiz-gen',
    },
    headers: getAuthHeaders(),
  });
  return resp.data;
}
export async function getFeedback(problemId: number) {
  const resp = await axios.get(`/api/gpt-redirect`, {
    params: {
      apiname: 'get-feedback',
      projectName: 'quiz-gen',
      problemId,
    },
    headers: getAuthHeaders(),
  });
  return resp.data;
}

export async function getCourseGeneratedProblemsCountBySection(courseId: string) {
  const resp = await axios.get('/api/gpt-redirect', {
    params: {
      courseId: courseId,
      apiname: 'generated-problems-count-by-section',
      projectName: 'quiz-gen',
    },
    headers: getAuthHeaders(),
  });
  return resp.data as Record<string, number>;
}
