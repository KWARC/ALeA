import axios, { AxiosError } from 'axios';
import { getAuthHeaders } from './lms';
import {
  AllCoursesStats,
  EnrolledCourseIds,
  GetSortedCoursesByConnectionsResponse,
  GetStudyBuddiesResponse,
  StudyBuddy,
  UserStats,
} from './study-buddy';

export async function getStudyBuddyUserInfo(courseId: string) {
  try {
    const resp = await axios.get(`/api/study-buddy/get-user-info/${courseId}`, {
      headers: getAuthHeaders(),
    });
    return resp.data as StudyBuddy;
  } catch (err) {
    const error = err as Error | AxiosError;
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) return undefined;
    }
    throw err;
  }
}

export async function updateStudyBuddyInfo(courseId: string, data: StudyBuddy) {
  await axios.post(`/api/study-buddy/update-info/${courseId}`, data, {
    headers: getAuthHeaders(),
  });
}

export async function getStudyBuddyList(courseId: string) {
  const resp = await axios.get(`/api/study-buddy/get-study-buddies/${courseId}`, {
    headers: getAuthHeaders(),
  });
  return resp.data as GetStudyBuddiesResponse;
}

export async function setActive(courseId: string, active: boolean) {
  await axios.post(
    `/api/study-buddy/set-active/${courseId}`,
    { active },
    { headers: getAuthHeaders() }
  );
}

export async function connectionRequest(courseId: string, receiverId: string) {
  await axios.post(
    `/api/study-buddy/connection-request/${courseId}`,
    { receiverId },
    { headers: getAuthHeaders() }
  );
}

export async function removeConnectionRequest(courseId: string, receiverId: string) {
  await axios.post(
    `/api/study-buddy/remove-connection-request/${courseId}`,
    { receiverId },
    { headers: getAuthHeaders() }
  );
}

export async function purgeStudyBuddyData() {
  const resp = await axios.post(`/api/study-buddy/purge-info`, {}, { headers: getAuthHeaders() });
  return resp.data as StudyBuddy;
}

export async function getStudyBuddyUsersStats(courseId: string, instanceId?: string) {
  const resp = await axios.get(`/api/study-buddy/get-users-stats/${courseId}`, {
    headers: getAuthHeaders(),
    params: { instanceId },
  });
  return resp.data as UserStats;
}

export async function getAllUsersStats(instanceId: string) {
  const resp = await axios.get<AllCoursesStats>('/api/study-buddy/get-all-users-stats', {
    headers: getAuthHeaders(),
    params: { instanceId },
  });
  return resp.data;
}

export async function getStudyBuddyCoursesSortedbyConnections(instanceId: string) {
  const resp = await axios.get<GetSortedCoursesByConnectionsResponse[]>(
    '/api/study-buddy/get-courses-sortedby-connections',
    { headers: getAuthHeaders(), params: { instanceId } }
  );
  return resp.data;
}
export async function getEnrolledCourseIds() {
  const resp = await axios.get(`api/study-buddy/get-enrolled-course-ids`, {
    headers: getAuthHeaders(),
  });
  return resp.data as EnrolledCourseIds[];
}
