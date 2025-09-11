import axios from 'axios';
import { getAuthHeaders } from './lmp';

export interface Announcement {
  id: number;
  courseId: string;
  instructorId: string;
  instanceId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  visibleUntil: string;
}

export type CreateAnnouncementRequest = Omit<
  Announcement,
  'id' | 'instructorId' | 'createdAt' | 'updatedAt'
>;

export interface DeleteAnnouncementRequest {
  id: number;
  courseId: string;
  instanceId: string;
}

export type UpdateAnnouncementRequest = Omit<
  Announcement,
  'instructorId' | 'createdAt' | 'updatedAt'
>;

export async function createAnnouncement(details: CreateAnnouncementRequest) {
  await axios.post('/api/announcement/create-announcement', details, {
    headers: getAuthHeaders(),
  });
}

export async function getAnnouncements(courseId: string, instanceId: string) {
  const resp = await axios.get('/api/announcement/get-announcements', {
    params: { courseId, instanceId },
  });
  return resp.data as Announcement[];
}

export async function getActiveAnnouncements(courseId: string, instanceId: string) {
  const resp = await axios.get('/api/announcement/get-active-announcements', {
    params: { courseId, instanceId },
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
