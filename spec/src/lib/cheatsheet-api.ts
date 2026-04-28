import axios from 'axios';

export interface CheatSheet {
  cheatsheetId: number;
  userId: string;
  universityId: string;
  courseId: string;
  instanceId: string;
  weekId: string;
  checksum: string;
  uploadedAt: string;
  createdAt: string;
}

export interface CheatSheetRequest {
  universityId: string;
  courseId: string;
  courseName: string;
  instanceId: string;
  scope?: string;
}

export interface UploadWindow {
  windowStart: string; // ISO string
  windowEnd: string; // ISO string
  weekId: string;
  isSkipped: boolean;
  isWithinWindow: boolean;
}

export interface CheatsheetUploadWindowResponse {
  hasUploadEnabled: boolean;
  currentWindow: UploadWindow | null;
  upcomingWindow: UploadWindow | null;
  allWindows: UploadWindow[];
  message?: string;
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
  const resp = await axios.post('/api/cheatsheet/post-cheatsheet', body);
  return resp.data;
}

export async function getCheatsheetUploadWindow(
  courseId: string,
  instanceId: string,
  universityId: string,
): Promise<CheatsheetUploadWindowResponse> {
  const resp = await axios.get('/api/cheatsheet/get-cheatsheet-upload-window', {
    params: { courseId, instanceId, universityId },
  });
  return resp.data as CheatsheetUploadWindowResponse;
}
