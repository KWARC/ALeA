import axios from 'axios';
import { getAuthHeaders } from './lmp';

export interface LectureSchedule {
  lectureDay: string;
  venue?: string;
  venueLink?: string;
  lectureStartTime: string;
  lectureEndTime: string;
  hasQuiz?: boolean;
}

export interface CourseMetadata {
  courseId: string;
  instanceId: string;
  lectureSchedule: LectureSchedule[];
}

export type AddLectureScheduleRequest = Pick<CourseMetadata, 'courseId' | 'instanceId'> & { lectureEntry: LectureSchedule  };

const COURSE_METADATA_BASE_URL = '/api/course-metadata';

export async function getLectureEntry(data: Pick<CourseMetadata, 'courseId' | 'instanceId'>) {
  const response = await axios.get(`${COURSE_METADATA_BASE_URL}/get-lecture`, {
    headers: getAuthHeaders(),
    params: data,
  });
  return response.data;
}

export async function addLectureSchedule(
  data: AddLectureScheduleRequest
) {
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/add-lecture-entry`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function updateLectureEntry(
  data: Pick<CourseMetadata, 'courseId' | 'instanceId'> & {
    lectureDay: string;
    lectureStartTime: string;
    lectureEndTime: string;
    updatedLectureEntry: LectureSchedule ;
  }
) {
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/update-lecture-entry`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function deleteLectureEntry(
  data: Pick<CourseMetadata, 'courseId' | 'instanceId'> & { lectureEntry: LectureSchedule  }
) {
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/delete-lecture-entry`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}
