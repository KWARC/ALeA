export interface CreateAnswerClassRequest {
  answerClassId: string;
  points: number;
  isTrait: boolean;
  closed: boolean;
  title: string;
  description: string; //from API
  count: number;
}

export interface CreateGradingRequest {
  customFeedback: string;
  answerId: number;
  answerClasses: CreateAnswerClassRequest[];
}

export interface UpdateGradingRequest {
  customFeedback: string;
  answerClasses: CreateAnswerClassRequest[];
  id: number;
}

export interface CreateAnswerRequest {
  answer: string;
  subProblemId: string;
  questionId: string;
  courseInstance?: string;
  questionTitle: string;
  courseId: string;
  homeworkId?: number;
}

export interface UpdateAnswerRequest {
  answer: string;
  id: number;
}

export interface CreateReviewRequest {
  answerId: number;
  reviewType: ReviewType;
}

export enum ReviewType {
  PEER = 'PEER',
  INSTRUCTOR = 'INSTRUCTOR',
  SELF = 'SELF',
}

export interface AnswerResponse {
  graded: boolean;
  reviewRequests: ReviewType[];
  id: number;
  questionId: string;
  subProblemId: string;
  userId: string;
  courseId: string;
  answer: string;
  courseInstance: string;
  questionTitle: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GradingInfo {
  id: number;
  checkerId: string;
  reviewType: ReviewType;
  answerId: number;
  customFeedback: string;
  totalPoints: number;
  answerClasses: GradingAnswerClass[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GradingWithAnswer extends GradingInfo {
  questionTitle: string;
  subProblemId: string;
  questionId: string;
  courseInstance: string;
  courseId: string;
  answer: string;
}

export interface GradingAnswerClass {
  id: number;
  answerClassId: string;
  gradingId: number;
  points: number;
  isTrait: boolean;
  closed: boolean;
  title: string;
  description: string; //from API
  count: number;
}

export interface ReviewRequest {
  answer: { id: number; answerId: number; questionTitle: string; updatedAt: Date }[];
  questionTitle: string;
}

export interface GradingItem {
  homeworkId?: number;
  questionId: string;
  studentId: string;
  updatedAt: string;
  answerId: number;
  numSubProblemsAnswered: number;
  numSubProblemsGraded: number;
  numSubProblemsInstructorGraded: number;
}
