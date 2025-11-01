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
  hasHomework?: boolean;
}
export interface GenerateLectureEntryResponse {
  courseId: string;
  count: number;
  filePath: string;
  alreadyExists: boolean;
  error?: string;
}

export type ScheduleType = 'lecture' | 'tutorial';

export type AddLectureScheduleRequest = Pick<CourseMetadata, 'courseId' | 'instanceId'> & {
  lectureEntry: LectureSchedule;
  scheduleType: ScheduleType;
};

export interface CourseQuizAndHomeworkInfo {
  hasQuiz: boolean;
  hasHomework: boolean;
}
export interface LectureScheduleItem {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  venue?: string;
  venueLink?: string;
}

const COURSE_METADATA_BASE_URL = '/api/course-metadata';

export async function getLectureEntry(data: Pick<CourseMetadata, 'courseId' | 'instanceId'>) {
  const response = await axios.get(`${COURSE_METADATA_BASE_URL}/get-lecture`, {
    headers: getAuthHeaders(),
    params: data,
  });
  return response.data;
}

export async function addLectureSchedule(data: AddLectureScheduleRequest) {
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
    updatedLectureEntry: LectureSchedule;
  }
) {
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/update-lecture-entry`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function deleteLectureEntry(
  data: Pick<CourseMetadata, 'courseId' | 'instanceId'> & { lectureEntry: LectureSchedule }
) {
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/delete-lecture-entry`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function updateHasHomework(
  data: Pick<CourseMetadata, 'courseId' | 'instanceId'> & { hasHomework: boolean }
) {
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/update-homework`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function updateHasQuiz(
  data: Pick<CourseMetadata, 'courseId' | 'instanceId'> & { hasQuiz: boolean }
) {
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/update-quiz`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function generateLectureEntry(
  courseId: string,
  instanceId: string
): Promise<GenerateLectureEntryResponse> {
  const response = await axios.post(
    `${COURSE_METADATA_BASE_URL}/generate-lecture-entry`,
    { courseId, instanceId },
    { headers: getAuthHeaders() }
  );
  return response.data;
}

export async function getCourseHomeworkAndQuizInfo(
  courseId: string,
  instanceId?: string
): Promise<CourseQuizAndHomeworkInfo> {
  const response = await axios.get(`${COURSE_METADATA_BASE_URL}/get-homework-and-quiz`, {
    params: { courseId, instanceId },
  });
  return response.data as CourseQuizAndHomeworkInfo;
}
export async function getLectureSchedule(
  courseId: string,
  instanceId: string
): Promise<LectureScheduleItem[]> {
  const response = await axios.get(`${COURSE_METADATA_BASE_URL}/get-lecture-schedule`, {
    headers: getAuthHeaders(),
    params: { courseId, instanceId },
  });
  return (response.data?.schedule ?? []) as LectureScheduleItem[];
}
