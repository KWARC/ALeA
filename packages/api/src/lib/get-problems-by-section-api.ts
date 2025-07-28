import axios, { AxiosError } from 'axios';

export async function getProblemsBySection(sectionUri: string, courseId: string) {
   const resp = await axios.get(
      `/api/get-problems-by-section?sectionUri=${encodeURIComponent(sectionUri)}&courseId=${courseId}`
    );
    return resp;
}
