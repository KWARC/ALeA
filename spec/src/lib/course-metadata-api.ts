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
  scheduleType: 'lecture' | 'tutorial';
  hasHomework?: boolean;
  seriesId?: string;
}

export interface InstructorInfo {
  id: string;
  name: string;
}


export interface CourseInfoMetadata extends CourseMetadata {
  courseName: string;
  notes: string;
  landing: string;
  slides: string;
  institution?: string;
  teaser?: string | null;
  instructors: InstructorInfo[];
  hasQuiz: boolean;
  updaterId?: string;
  universityId: string;
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
    scheduleType: ScheduleType;
  }
) {
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/update-lecture-entry`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function deleteLectureEntry(
  data: Pick<CourseMetadata, 'courseId' | 'instanceId'> & {
    lectureEntry: LectureSchedule;
    scheduleType: ScheduleType;
  }
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

export async function updateSeriesId(data: {
  courseId: string;
  instanceId: string;
  seriesId: string;
}) {
  const res = await axios.post('/api/course-metadata/update-series-id', data, {
    headers: getAuthHeaders(),
  });
  return res.data;
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

export async function addCourseMetadata(data: CourseInfoMetadata) {
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/add-course-metadata`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function updateCourseInfoMetadata(data: Partial<CourseInfoMetadata>) {
  const response = await axios.post(
    `${COURSE_METADATA_BASE_URL}/update-course-info-metadata`,
    data,
    {
      headers: getAuthHeaders(),
    }
  );
  return response.data;
}

export async function getCourseInfoMetadata(
  courseId: string,
  instanceId: string
): Promise<CourseInfoMetadata | null> {
  const response = await axios.get(`${COURSE_METADATA_BASE_URL}/get-course-info-metadata`, {
    headers: getAuthHeaders(),
    params: { courseId, instanceId },
  });
  return response.data;
}


