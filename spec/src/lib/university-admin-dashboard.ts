import axios from 'axios';
export interface SemesterData {
  universityId?: string;
  instanceId?: string;
  semesterStart: string;
  semesterEnd: string;
  lectureStartDate: string;
  lectureEndDate: string;
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

export interface EditHolidayRequest {
  universityId: string;
  instanceId: string;
  originalDate: string;
  updatedHoliday: Holiday;
}

export interface DeleteSingleHolidayRequest {
  universityId: string;
  instanceId: string;
  dateToDelete: string;
}

const SEMESTER_BASE_URL = '/api/university-admin/semester-info';

export async function getSemesterInfo(universityId: string, instanceId: string) {
  const response = await axios.get(`${SEMESTER_BASE_URL}/get-semester-info`, {
    params: { universityId, instanceId },
  });
  return response.data.semesterInfo as SemesterData[];
}

export async function createSemester(data: SemesterData) {
  await axios.post(`${SEMESTER_BASE_URL}/create-semester`, data);
}

export async function updateSemester(data: SemesterData) {
  const response = await axios.post(`${SEMESTER_BASE_URL}/update-semester`, data);
  return response.data;
}

export async function deleteSemester(universityId: string, instanceId: string) {
  const response = await axios.post(
    `${SEMESTER_BASE_URL}/delete-semester`,
    {
      universityId,
      instanceId,
    }
  );
  return response.data;
}

export async function getInstances(universityId: string) {
  const response = await axios.get(`${SEMESTER_BASE_URL}/get-instances`, {
    params: { universityId },
  });
  return response.data.data as string[];
}

export async function getHolidaysInfo(universityId: string, instanceId: string) {
  const response = await axios.get(`${SEMESTER_BASE_URL}/get-holidays-info`, {
    params: { universityId, instanceId },
  });
  return response.data.holidays as Holiday[];
}

export async function uploadHolidays(data: UploadHolidaysRequest) {
  const response = await axios.post(`${SEMESTER_BASE_URL}/upload-holidays`, data);
  return response.data;
}

export async function editHoliday(data: EditHolidayRequest) {
  const response = await axios.post(`${SEMESTER_BASE_URL}/edit-holiday`, data);
  return response.data;
}

export async function deleteSingleHoliday(data: DeleteSingleHolidayRequest) {
  const response = await axios.post(`${SEMESTER_BASE_URL}/delete-single-holiday`, data);
  return response.data;
}


export async function getLatestInstance(institutionId: string): Promise<string> {
  const response = await axios.get(`/api/get-latest-instance/${institutionId}`);
  if (response.data.instanceId) {
    return response.data.instanceId;
  }
  throw new Error(response.data.error || 'Failed to get latest instanceId');
}

export async function validateInstitution(institutionId: string): Promise<boolean> {
  try {
    const response = await axios.get(`/api/validate-institution/${institutionId}`);
    return response.data.exists === true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return false;
      }
      if (error.response?.status === 500) {
        console.error('Server error validating institution:', error.response?.data);
        throw new Error(error.response?.data?.error || 'Failed to validate institutionId');
      }
    }
    throw error;
  }
}

export async function validateInstance(institutionId: string, instanceIdParam: string): Promise<boolean> {
  try {
    const response = await axios.get(`/api/validate-instance/${institutionId}/${instanceIdParam}`);
    return response.data.exists === true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return false;
      }
      if (error.response?.status === 500) {
        console.error('Server error validating instance:', error.response?.data);
        throw new Error(error.response?.data?.error || 'Failed to validate instanceId');
      }
    }
    throw error;
  }
}
