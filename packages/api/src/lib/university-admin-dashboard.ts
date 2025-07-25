import axios from 'axios'

/* ====== TYPES ====== */

export interface SemesterData {
  universityId: string;
  instanceId: string;
  semesterStart: string;
  semesterEnd: string;
  lectureStartDate: string;
  lectureEndDate: string;
  updatedBy: string;
  timeZone: string;
}

export interface Holiday {
  date: string;
  name: string;
}

export interface UploadHolidaysRequest {
  universityId: string;
  instanceId: string;
  holidays: Holiday[];
}

/* ====== CONSTANTS ====== */

const SEMESTER_BASE_URL = '/api/university-admin/semester-info';
const HOLIDAYS_BASE_URL = '/api/university-admin/holidays';

/* ====== SEMESTER APIs ====== */

/** Get semester info */
export async function getSemesterInfo(universityId: string, instanceId: string) {
  const response = await axios.get(`${SEMESTER_BASE_URL}/get-semester-info`, {
    params: { universityId, instanceId },
  });
  return response.data.semesterInfo as SemesterData[];
}

/** Create new semester */
export async function createSemester(data: SemesterData) {
  const response = await axios.post(`${SEMESTER_BASE_URL}/create-semester`, data);
  return response.data;
}

/** Update semester */
export async function updateSemester(data: SemesterData) {
  const response = await axios.post(`${SEMESTER_BASE_URL}/update-semester`, data);
  return response.data;
}

/** Delete semester */
export async function deleteSemester(universityId: string, instanceId: string) {
  const response = await axios.post(`${SEMESTER_BASE_URL}/delete-semester`, {
    universityId,
    instanceId,
  });
  return response.data;
}

/* ====== HOLIDAYS APIs ====== */

/** Get holidays */
export async function getHolidays(universityId: string, instanceId: string) {
  const response = await axios.get(`${HOLIDAYS_BASE_URL}/list-holidays`, {
    params: { universityId, instanceId },
  });
  return response.data.holidays as Holiday[];
}

/** Upload or update holidays JSON */
export async function uploadHolidays(data: UploadHolidaysRequest) {
  const response = await axios.post(`${HOLIDAYS_BASE_URL}/upload-holidays`, data);
  return response.data;
}

/** Delete all holidays */
export async function deleteAllHolidays(universityId: string, instanceId: string) {
  const response = await axios.post(`${HOLIDAYS_BASE_URL}/delete-holidays`, {
    universityId,
    instanceId,
  });
  return response.data;
}
