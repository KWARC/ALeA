export interface StudentData {
  userId: string;
  name: string;
  email: string;
  mobile: string;
  altMobile?: string;
  programme: string;
  courses: string;
  gpa: string;
  yearOfAdmission: string;
  yearOfGraduation: string;
  location: string;
  resumeUrl?: string;
  socialLinks?: Record<string, string>;
  about?: string;
}

export interface RecruiterData {
  userId: string;
  name: string;
  email: string;
  position: string;
  mobile?: string;
  altMobile?: string;
  organizationId?: number;
  socialLinks?: Record<string, string>;
  about?: string;
}

export interface OrganizationData {
  id?: number;
  companyName: string;
  domain: string;
  incorporationYear?: string;
  isStartup?: boolean;
  about?: string;
  website?: string;
  companyType?: string;
  officeAddress?: string;
  officePostalCode?: string;
}

export type RecruiterAndOrgData = RecruiterData & OrganizationData;

export interface JobCategoryInfo {
  id: number;
  jobCategory: string;
  startDate: string;
  endDate?: string;
  internshipPeriod?: string;
}

export interface JobPostInfo {
  id: number;
  organizationId: number;
  jobCategoryId: number;
  session: string;
  jobTitle: string;
  jobDescription: string;
  workLocation: string;
  workMode: string;
  qualification: string;
  targetYears: string;
  openPositions: number;
  currency: string;
  stipend: number;
  facilities: string;
  applicationDeadline: string;
  createdByUserId?: string;
  createdAt?: string;
}
export type JobPostFormData = Omit<
  JobPostInfo,
  "id" | "organizationId" | "jobCategoryId"
>;
export type InitialJobData = Partial<JobPostInfo>;
export interface JobApplicationInfo {
  id: number;
  jobPostId: number;
  applicantId: string;
  applicationStatus: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ApplicationWithProfile = JobApplicationInfo & {
  jobTitle?: string;
  studentProfile: StudentData;
};

export type ApplicationWithJobAndOrgTitle = JobApplicationInfo & {
  jobTitle?: string;
  companyName?: string;
}

export const APPLICATION_STATUS = {
  APPLIED: 'APPLIED',
  APPLICATION_WITHDRAWN: 'APPLICATION_WITHDRAWN',
  OFFER_ACCEPTED: 'OFFER_ACCEPTED',
  OFFER_REJECTED: 'OFFER_REJECTED',

  SHORTLISTED_FOR_INTERVIEW: 'SHORTLISTED_FOR_INTERVIEW',
  ON_HOLD: 'ON_HOLD',
  REJECTED: 'REJECTED',
  OFFERED: 'OFFERED',
  OFFER_REVOKED: 'OFFER_REVOKED',
} as const;

export type ApplicationStatus = (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];

export const APPLICATION_ACTION = {
  WITHDRAW_APPLICATION: 'WITHDRAW_APPLICATION',
  ACCEPT_OFFER: 'ACCEPT_OFFER',
  REJECT_OFFER: 'REJECT_OFFER',

  SHORTLIST_FOR_INTERVIEW: 'SHORTLIST_FOR_INTERVIEW',
  ON_HOLD: 'ON_HOLD',
  REJECT: 'REJECT',
  SEND_OFFER: 'SEND_OFFER',
  REVOKE_OFFER: 'REVOKE_OFFER',
} as const;

export type ApplicationAction = (typeof APPLICATION_ACTION)[keyof typeof APPLICATION_ACTION];

export const APPLICANT_ACTIONS = new Set<ApplicationAction>([
  APPLICATION_ACTION.WITHDRAW_APPLICATION,
  APPLICATION_ACTION.ACCEPT_OFFER,
  APPLICATION_ACTION.REJECT_OFFER,
]);

export const RECRUITER_ACTIONS = new Set<ApplicationAction>([
  APPLICATION_ACTION.SHORTLIST_FOR_INTERVIEW,
  APPLICATION_ACTION.ON_HOLD,
  APPLICATION_ACTION.REJECT,
  APPLICATION_ACTION.SEND_OFFER,
  APPLICATION_ACTION.REVOKE_OFFER,
]);


export interface UpdateJobApplicationRequest {
  id: number;
  action: ApplicationAction;
  message?: string;
}