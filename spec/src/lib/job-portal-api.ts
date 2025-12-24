import axios from 'axios';
import { getAuthHeaders } from './lmp';
import {
  JobPostInfo,
  JobCategoryInfo,
  OrganizationData,
  RecruiterData,
  StudentData,
  JobApplicationInfo,
  UpdateJobApplicationRequest,
  JobApplicationTimelineEntry,
} from './job-portal';
export type CreateStudentProfileData = Omit<StudentData, 'userId' | 'socialLinks'>;
export async function createStudentProfile(data: CreateStudentProfileData) {
  await axios.post('/api/job-portal/create-student-profile', data, {
    headers: getAuthHeaders(),
  });
}
export type UpdateStudentProfileData = Omit<StudentData, 'userId' | 'socialLinks'> & {
  socialLinks: string;
};
export async function updateStudentProfile(data: UpdateStudentProfileData) {
  await axios.post('/api/job-portal/update-student-profile', data, {
    headers: getAuthHeaders(),
  });
}

export type UpdateRecruiterProfileData = Omit<RecruiterData, 'userId' | 'socialLinks'> & {
  socialLinks: string;
};
export async function updateRecruiterProfile(data: UpdateRecruiterProfileData) {
  await axios.post('/api/job-portal/update-recruiter-profile', data, {
    headers: getAuthHeaders(),
  });
}

export async function getStudentProfile() {
  const resp = await axios.get('/api/job-portal/get-student-profile', {
    headers: getAuthHeaders(),
  });
  return resp.data as StudentData;
}

export async function getRecruiterProfile() {
  const resp = await axios.get('/api/job-portal/get-recruiter-profile', {
    headers: getAuthHeaders(),
  });
  return resp.data as RecruiterData;
}

export async function checkIfUserRegisteredOnJP() {
  const response = await axios.get('/api/job-portal/check-user-registered-on-jp', {
    headers: getAuthHeaders(),
  });
  return response.data as { exists: boolean };
}

export async function updateOrganizationProfile(data: OrganizationData, id: number) {
  await axios.post(
    '/api/job-portal/update-organization-profile',
    { data, id },
    { headers: getAuthHeaders() }
  );
}

export async function getOrganizationProfile(id: number) {
  const resp = await axios.get('/api/job-portal/get-organization-profile', {
    headers: getAuthHeaders(),
    params: { id },
  });
  return resp.data as OrganizationData;
}

export async function inviteRecruiterToOrg(email: string, orgId: number) {
  const resp = await axios.post(
    '/api/job-portal/create-invite-to-org',
    { email, orgId },
    { headers: getAuthHeaders() }
  );
  return resp.status === 201;
}

export async function registerRecruiter(
  name: string,
  email: string,
  position: string,
  companyName: string
) {
  const resp = await axios.post(
    '/api/job-portal/register-recruiter',
    {
      name,
      email,
      position,
      companyName,
    },
    { headers: getAuthHeaders() }
  );
  return resp.data;
}

export type CreateJobCategoryRequest = Omit<JobCategoryInfo, 'id'>;
export async function createJobCategory(data: CreateJobCategoryRequest) {
  await axios.post('/api/job-portal/create-job-category', data, {
    headers: getAuthHeaders(),
  });
}

export async function updateJobCategory(data: JobCategoryInfo) {
  await axios.post('/api/job-portal/update-job-category', data, {
    headers: getAuthHeaders(),
  });
}

export async function deleteJobCategory(id: number, instanceId?: string) {
  await axios.post(
    '/api/job-portal/delete-job-category',
    { id, instanceId },
    { headers: getAuthHeaders() }
  );
}

export async function getJobCategories(instanceId: string) {
  const resp = await axios.get('/api/job-portal/get-job-categories', {
    headers: getAuthHeaders(),
    params: { instanceId },
  });
  return resp.data as JobCategoryInfo[];
}

export type CreateJobPostRequest = Omit<JobPostInfo, 'id'>;
export async function createJobPost(data: CreateJobPostRequest) {
  await axios.post('/api/job-portal/create-job-post', data, {
    headers: getAuthHeaders(),
  });
}

export async function getJobPosts(organizationId: number) {
  const resp = await axios.get('/api/job-portal/get-job-post', {
    headers: getAuthHeaders(),
    params: { organizationId },
  });
  return resp.data as JobPostInfo[];
}

export async function getJobPostById(jobPostId: number) {
  const resp = await axios.get('/api/job-portal/get-job-post-by-id', {
    headers: getAuthHeaders(),
    params: { jobPostId },
  });
  return resp.data as JobPostInfo;
}

export async function getAllJobPosts() {
  const resp = await axios.get('/api/job-portal/get-all-job-posts', {
    headers: getAuthHeaders(),
  });
  return resp.data as JobPostInfo[];
}

export async function updateJobPost(data: JobPostInfo) {
  await axios.post('/api/job-portal/update-job-post', data, {
    headers: getAuthHeaders(),
  });
}

export async function deleteJobPost(id: number) {
  await axios.post('/api/job-portal/delete-job-post', { id }, { headers: getAuthHeaders() });
}

export async function createJobApplication(jobPostId: number) {
  await axios.post('/api/job-portal/create-job-application', {jobPostId}, {
    headers: getAuthHeaders(),
  });
}

export async function getJobApplicationsByJobPost(jobPostId: number) {
  const resp = await axios.get('/api/job-portal/get-job-applications-by-jobpost', {
    headers: getAuthHeaders(),
    params: { jobPostId },
  });
  return resp.data as JobApplicationInfo[];
}

export async function getJobApplicationsByUserId() {
  const resp = await axios.get('/api/job-portal/get-job-applications-by-userid', {
    headers: getAuthHeaders(),
  });
  return resp.data as JobApplicationInfo[];
}

export async function getJobApplicationTimeline(applicationId:number) {
  const resp = await axios.get('/api/job-portal/get-job-application-timeline', {
    headers: getAuthHeaders(),
    params: { applicationId },
  });
  return resp.data as JobApplicationTimelineEntry[];
}

export async function updateJobApplication(data: UpdateJobApplicationRequest) {
  await axios.post('/api/job-portal/update-job-application', data, {
    headers: getAuthHeaders(),
  });
}
export async function getStudentProfileUsingUserId(userId: string) {
  const resp = await axios.get('/api/job-portal/get-student-profile-using-userid', {
    headers: getAuthHeaders(),
    params: { userId },
  });
  return resp.data as StudentData;
}
