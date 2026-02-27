import axios from 'axios';

export interface CheatSheet {
  id: number;
  userId: string;
  universityId: string;
  courseId: string;
  instanceId: string;
  weekId: string;
  checksum: string;
  dateOfDownload: string;
  createdAt: string;
}

export interface CheatSheetRequest {
  universityId: string;
  courseId: string;
  courseName: string;
  instanceId: string;
}
export async function getCheatSheets(courseId: string, instanceId: string, userId?: string) {
  const resp = await axios.get('/api/cheatsheet/get-cheatsheets', {
    params: { courseId, instanceId, userId },
  });
  return resp.data as CheatSheet[];
}

export async function getCheatSheetFile(
  checksum: string
): Promise<{ blob: Blob; filename?: string }> {
  const resp = await axios.get('/api/cheatsheet/get-cheatsheet-file', {
    params: { checksum },
    responseType: 'blob',
  });
  const filename = resp.headers['content-disposition']?.match(/filename="?([^"]+)"?/)?.[1]; // Matches and captures the filename from Content-Disposition, handling optional quotes
  return { blob: resp.data as Blob, filename };
}

export async function createCheatSheet(body: CheatSheetRequest) {
  const resp = await axios.post('/api/cheatsheet/create-cheatsheet', body,{
      responseType: 'blob',  
    });
  const filename = resp.headers['content-disposition']?.match(/filename="?([^"]+)"?/)?.[1]; // Matches and captures the filename from Content-Disposition, handling optional quotes
  return { blob: resp.data as Blob, filename };
}
export async function postScannedCheatSheet(body: FormData) {
  await axios.post('/api/cheatsheet/post-cheatsheet', body);
}
