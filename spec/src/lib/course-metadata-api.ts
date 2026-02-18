import axios from 'axios';
export interface LectureSchedule {
  lectureDay: string;
  venue?: string;
  venueLink?: string;
  lectureStartTime: string;
  lectureEndTime: string;
  hasQuiz?: boolean;
  quizOffsetMinutes?: number;
  quizOffsetReference?: 'lecture-start' | 'lecture-end';
  quizDurationMinutes?: number;
  quizFeedbackDelayMinutes?: number;
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
  url?: string;
}

export interface CourseInfoMetadata extends CourseMetadata {
  courseName: string;
  notes: string;
  landing: string;
  slides: string;
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
    params: data,
  });
  return response.data;
}

export async function addLectureSchedule(data: AddLectureScheduleRequest) {
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/add-lecture-entry`, data);
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
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/update-lecture-entry`, data);
  return response.data;
}

export async function deleteLectureEntry(
  data: Pick<CourseMetadata, 'courseId' | 'instanceId'> & {
    lectureEntry: LectureSchedule;
    scheduleType: ScheduleType;
  }
) {
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/delete-lecture-entry`, data);
  return response.data;
}

export async function updateHasHomework(
  data: Pick<CourseMetadata, 'courseId' | 'instanceId'> & { hasHomework: boolean }
) {
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/update-homework`, data);
  return response.data;
}

export async function updateHasQuiz(
  data: Pick<CourseMetadata, 'courseId' | 'instanceId'> & { hasQuiz: boolean }
) {
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/update-quiz`, data);
  return response.data;
}

export async function checkLectureEntriesExist(courseId: string): Promise<{ hasEntries: boolean; count: number }> {
  const response = await axios.get(`${COURSE_METADATA_BASE_URL}/check-lecture-entries`, {
    params: { courseId },
  });
  return response.data;
}

export async function generateLectureEntry(
  courseId: string,
  instanceId: string
): Promise<GenerateLectureEntryResponse> {
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/generate-lecture-entry`, {
    courseId,
    instanceId,
  });
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
    params: { courseId, instanceId },
  });
  return (response.data?.schedule ?? []) as LectureScheduleItem[];
}

export async function addCourseMetadata(data: CourseInfoMetadata) {
  const response = await axios.post(`${COURSE_METADATA_BASE_URL}/add-course-metadata`, data, {});
  return response.data;
}

export async function updateCourseInfoMetadata(data: Partial<CourseInfoMetadata>) {
  const response = await axios.post(
    `${COURSE_METADATA_BASE_URL}/update-course-info-metadata`,
    data
  );
  return response.data;
}

export async function getCourseInfoMetadata(
  courseId: string,
  instanceId: string
): Promise<CourseInfoMetadata | null> {
  const response = await axios.get(`${COURSE_METADATA_BASE_URL}/get-course-info-metadata`, {
    params: { courseId, instanceId },
  });
  return response.data;
}

export async function getCourseIdsByUniversity(
  universityId: string,
  instanceId?: string
): Promise<string[]> {
  const response = await axios.get(`${COURSE_METADATA_BASE_URL}/get-course-ids-by-university`, {
    params: { universityId, ...(instanceId && { instanceId }) },
  });
  return response.data?.courseIds || [];
}

export async function addCourseToSemester(data: {
  universityId: string;
  instanceId: string;
  courseId: string;
}) {
  const response = await axios.post(
    '/api/university-admin/semester-courses/add-course-to-semester',
    data
  );
  return response.data;
}

export async function removeCourseFromSemester(data: {
  universityId: string;
  instanceId: string;
  courseId: string;
}) {
  const response = await axios.post(
    '/api/university-admin/semester-courses/remove-course-from-semester',
    data
  );
  return response.data;
}

export async function createNewCourse(data: {
  universityId: string;
  instanceId: string;
  courseId: string;
}) {
  const response = await axios.post(
    '/api/university-admin/semester-courses/create-new-course',
    data
  );
  return response.data;
}
