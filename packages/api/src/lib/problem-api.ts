import axios from 'axios';

export interface ProblemData {
  problemId: string;
  category: string;
  labels: string[];
  showForeignLanguageNotice?: boolean;
  matchedLanguage?: string;
  outOfSyllabusConcepts?: string[];
}

export interface CourseProblemCounts {
  [sectionUri: string]: number;
}

export async function getProblemsPerSection(
  sectionUri: string,
  courseId: string,
  languages?: string
) {
  const resp = await axios.get(`/api/get-problems-per-section`, {
    params: {
      sectionUri,
      ...(courseId ? { courseId } : {}),
      ...(languages ? { languages } : {}),
    },
  });
  return resp.data as ProblemData[];
}

export async function getCourseProblemCounts(courseId: string) {
  const resp = await axios.get(`/api/get-course-problem-counts`, {
    params: { courseId },
  });
  return resp.data as CourseProblemCounts;
}
