import axios from 'axios'
import { getAuthHeaders } from './lmp'

/* ====== TYPES ====== */

export interface SemesterData {
  universityId: string;
  instanceId: string;
  semesterStart: string;
  semesterEnd: string;
  lectureStartDate: string;
  lectureEndDate: string;
  userId: string;
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
  userId: string;
}

export interface EditHolidayRequest {
  universityId: string;
  instanceId: string;
  originalDate: string;
  updatedHoliday: Holiday;
  userId?: string;
}

export interface DeleteSingleHolidayRequest {
  universityId: string;
  instanceId: string;
  dateToDelete: string;
}



/* ====== CONSTANTS ====== */

const SEMESTER_BASE_URL = '/api/university-admin/semester-info';
const HOLIDAYS_BASE_URL = '/api/university-admin/semester-info';

/* ====== SEMESTER APIs ====== */

export async function getSemesterInfo(universityId: string, instanceId: string) {
  const response = await axios.get(`${SEMESTER_BASE_URL}/get-semester-info`, {
    params: { universityId, instanceId },
    headers: getAuthHeaders(),
  });
  return response.data.semesterInfo as SemesterData[];
}

export async function createSemester(data: SemesterData) {
  const response = await axios.post(`${SEMESTER_BASE_URL}/create-semester`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function updateSemester(data: SemesterData) {
  const response = await axios.post(`${SEMESTER_BASE_URL}/update-semester`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function deleteSemester(universityId: string, instanceId: string) {
  const response = await axios.post(`${SEMESTER_BASE_URL}/delete-semester`, {
    universityId,
    instanceId,
  }, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

/* ====== HOLIDAYS APIs ====== */

export async function getHolidaysInfo(universityId: string, instanceId: string) {
  const response = await axios.get(`${HOLIDAYS_BASE_URL}/get-holidays-info`, {
    params: { universityId, instanceId },
    headers: getAuthHeaders(),
  });
  return response.data.holidays as Holiday[];
}

export async function uploadHolidays(data: UploadHolidaysRequest) {
  const response = await axios.post(`${HOLIDAYS_BASE_URL}/upload-holidays`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function editHoliday(data: EditHolidayRequest) {
  const response = await axios.post(`${HOLIDAYS_BASE_URL}/edit-holiday`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function deleteSingleHoliday(data: DeleteSingleHolidayRequest) {
  const response = await axios.post(`/api/university-admin/semester-info/delete-single-holiday`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}


export async function deleteAllHolidays(universityId: string, instanceId: string) {
  const response = await axios.post(`${HOLIDAYS_BASE_URL}/delete-all-holidays`, {
    universityId,
    instanceId,
  }, {
    headers: getAuthHeaders(),
  });
  return response.data;
}
