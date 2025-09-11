import axios from 'axios';

export async function getOldSemesters() {
  const res = await axios.get('/api/old-quiz/semesters');
  return res.data;
}
export async function getOldQuizFiles(semester: string) {
  const res = await axios.get('/api/old-quiz/files', {
    params: { semester },
  });
  return res.data;
}
export async function getOldQuizFile(semester: string, filename: string) {
  const res = await axios.get('/api/old-quiz/file', {
    params: { semester, filename },
  });
  return res.data;
}
