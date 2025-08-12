import axios from 'axios';
import { getAuthHeaders } from './lmp';

export interface Announcement {
  id: number;
  courseId: string;
  instructorId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  visibleUntil: string;
}

export interface CreateAnnouncementRequest {
  courseId: string;
  title: string;
  content: string;
  visibleUntil?: string;
}

export interface EditAnnouncementRequest {
  id: number;
  courseId: string;
  title: string;
  content: string;
  visibleUntil?: string;
}

export interface DeleteAnnouncementRequest {
  id: number;
  courseId: string;
}

export interface UpdateAnnouncementRequest {
  id: number;
  courseId?: string;
  title?: string;
  content?: string;
  visibleUntil?: string;
}

export async function createAnnouncement(details: CreateAnnouncementRequest) {
  await axios.post('/api/announcement/createAnnouncement', details, {
    headers: getAuthHeaders(),
  });
}

export async function getAnnouncement(courseId?: string) {
  const resp = await axios.get('/api/announcements', {
    params: courseId ? { courseId } : {}, //
  });
  return resp.data as Announcement[];
}

export async function getValidAnnouncement(courseId?: string) {
  const resp = await axios.get('/api/announcements', {
    params: { courseId },
  });

  const now = new Date();
  return (resp.data as Announcement[]).filter(
    (a) => !a.visibleUntil || new Date(a.visibleUntil) > now
  );
}

export async function editAnnouncement(details: EditAnnouncementRequest) {
  await axios.post('/api/announcements', details, {
    headers: getAuthHeaders(),
  });
}

export async function deleteAnnouncement(details: DeleteAnnouncementRequest) {
  await axios.post('/api/announcements/delete', details, {
    headers: getAuthHeaders(),
  });
}

export async function updateAnnouncement(details: UpdateAnnouncementRequest) {
  await axios.post('/api/announcements/update', details, {
    headers: getAuthHeaders(),
  });
}
