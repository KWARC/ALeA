export enum MeetType {
  Physical = 'Physical',
  Virtual = 'Virtual',
  Both = 'Both',
}

export enum Languages {
  Deutsch = 'Deutsch',
  English = 'English',

  Arabic = 'Arabic',
  Bengali = 'Bengali',
  Hindi = 'Hindi',
  French = 'French',
  Japanese = 'Japanese',
  Korean = 'Korean',
  Mandarin = 'Mandarin',
  Marathi = 'Marathi',
  Persian = 'Persian',
  Portuguese = 'Portuguese',
  Russian = 'Russian',
  Spanish = 'Spanish',
  Tamil = 'Tamil',
  Telugu = 'Telugu',
  Turkish = 'Turkish',
  Urdu = 'Urdu',
  Vietnamese = 'Vietnamese',
  Others = 'Others',
}

export enum Days {
  Mon = 'Mon',
  Tue = 'Tue',
  Wen = 'Wen',
  Thu = 'Thu',
  Fri = 'Fri',
  Sat = 'Sat',
  Sun = 'Sun',
}

export interface StudyBuddy {
  userId: string;
  userName: string;
  intro: string;
  studyProgram: string;
  email: string;
  semester: number;
  meetType: MeetType;
  languages: string;
  active: boolean;
  dayPreference: string;
  courseId: string;
}

export interface GetStudyBuddiesResponse {
  courseId: string;
  connected: StudyBuddy[];
  requestSent: StudyBuddy[];
  requestReceived: StudyBuddy[];
  other: StudyBuddy[];
}

export interface UserStats extends AllCoursesStats {
  connections: { senderId: string; receiverId: string }[];
  userIdsAndActiveStatus: { userId: string; activeStatus: boolean }[];
}
export interface AllCoursesStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  numberOfConnections: number;
  unacceptedRequests: number;
}
export interface EnrolledCourseIds {
  courseId: string;
  activeStatus: boolean;
}
export interface GetSortedCoursesByConnectionsResponse {
  courseId: string;
  member: number;
}
