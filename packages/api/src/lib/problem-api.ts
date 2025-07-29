import axios, { AxiosError } from 'axios';

export async function getProblemsBySection(sectionUri: string, courseId?: string) {
  const resp = await axios.get(`/api/get-problems-by-section`, {
    params: {
      sectionUri,
      ...(courseId ? { courseId } : {}),
    },
  });
  return resp.data;
}

export async function getProblemCountsByCourse(courseId: string) {
  const resp = await axios.get(`/api/get-course-problem-counts`, {
    params: { courseId },
  });
  return resp.data;
}
