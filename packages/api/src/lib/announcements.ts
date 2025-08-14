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
  await axios.post('/api/announcement/create-announcement', details, {
    headers: getAuthHeaders(),
  });
}

export async function getAnnouncement(courseId?: string) {
  const resp = await axios.get('/api/announcement/get-announcement', {
    params: courseId ? { courseId } : {}, //
  });
  return resp.data as Announcement[];
}

export async function getActiveAnnouncements(courseId?: string) {
  const resp = await axios.get('/api/announcement/get-active-announcements', {
    params: { courseId },
  });

  return resp.data as Announcement[];
}

export async function deleteAnnouncement(details: DeleteAnnouncementRequest) {
  await axios.post('/api/announcement/delete-announcement', details, {
    headers: getAuthHeaders(),
  });
}

export async function updateAnnouncement(details: UpdateAnnouncementRequest) {
  await axios.post('/api/announcement/update-announcement', details, {
    headers: getAuthHeaders(),
  });
}
