import axios from 'axios';
import { getAuthHeaders } from './lmp';

export interface LectureEntry {
  lectureDay: string;
  venue?: string;
  venueLink?: string;
  lectureStartTime: string;
  lectureEndTime: string;
  hasHomework?: boolean;
  hasQuiz?: boolean;
}

export interface CourseMetadata {
  courseId: string;
  instanceId: string;
  lectureSchedule: LectureEntry[];
}

const COURSE_METADATA_BASE_URL = '/api/course-metadata';

export async function getLectureEntry(data: Pick<CourseMetadata, 'courseId' | 'instanceId'>) {
  const response = await axios.get(`${COURSE_METADATA_BASE_URL}/get-lecture`, {
    headers: getAuthHeaders(),
    params: data,
  });
  return response.data;
}

export async function addLectureEntry(
  data: Pick<CourseMetadata, 'courseId' | 'instanceId'> & { lectureEntry: LectureEntry }
) {
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/add-lecture-entry`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function updateLectureEntry(
  data: Pick<CourseMetadata, 'courseId' | 'instanceId'> & {
    lectureDay: string;
    updatedLectureEntry: LectureEntry;
  }
) {
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/update-lecture-entry`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function deleteLectureEntry(
  data: Pick<CourseMetadata, 'courseId' | 'instanceId'> & { lectureDay: string }
) {
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/delete-lecture-entry`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}
