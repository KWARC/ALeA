import axios from 'axios';

const SEMESTER_BASE_URL = '/api/university-admin/semester-info';
const HOLIDAYS_BASE_URL = '/api/university-admin/holidays';

// ========== SEMESTER APIs ==========

/* Fetch all semesters */
export async function fetchSemesters(universityId: string, instanceId: string) {
  const response = await axios.get(`${SEMESTER_BASE_URL}/list-semester`, {
    params: { universityId, instanceId },
  });
  return response.data.semesterInfo;
}

/* Create a new semester */
export async function createSemester(semesterData: {
  universityId: string;
  instanceId: string;
  semesterStart: string;
  semesterEnd: string;
  lectureStartDate: string;
  lectureEndDate: string;
  updatedBy: string;
}) {
  const response = await axios.post(`${SEMESTER_BASE_URL}/create-semester`, semesterData);
  return response.data;
}

/* Update existing semester */
export async function updateSemester(semesterData: {
  universityId: string;
  instanceId: string;
  semesterStart: string;
  semesterEnd: string;
  lectureStartDate: string;
  lectureEndDate: string;
  updatedBy: string;
}) {
  const response = await axios.post(`${SEMESTER_BASE_URL}/update-semester`, semesterData);
  return response.data;
}

/* Delete semester */
export async function deleteSemester(universityId: string, instanceId: string) {
  const response = await axios.post(`${SEMESTER_BASE_URL}/delete-semester`, {
    universityId,
    instanceId,
  });
  return response.data;
}

// ========== HOLIDAYS APIs ==========

/* Fetch holidays */
export async function fetchHolidays(universityId: string, instanceId: string) {
  const response = await axios.get(`${HOLIDAYS_BASE_URL}/list-holidays`, {
    params: { universityId, instanceId },
  });
  return response.data.holidays;
}

/* Upload (add or update) holidays JSON */
export async function uploadHolidays(data: {
  universityId: string;
  instanceId: string;
  holidays: { date: string; name: string }[]; // or whatever shape your JSON has
}) {
  const response = await axios.post(`${HOLIDAYS_BASE_URL}/upload-holidays`, data);
  return response.data;
}

/* Delete holidays */
export async function deleteAllHolidays(universityId: string, instanceId: string) {
  const response = await axios.post(`/api/university-admin/holidays/delete-holidays`, {
    universityId,
    instanceId,
  });
  return response.data;
}
