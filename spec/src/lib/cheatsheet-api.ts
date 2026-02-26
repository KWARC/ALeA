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

