import { FTML } from '@flexiformal/ftml';
import { FTMLProblemWithSolution } from './quiz';

export type HomeworkPhase =
  | 'UNSET'
  | 'NOT_GIVEN'
  | 'GIVEN'
  | 'SUBMISSION_CLOSED'
  | 'FEEDBACK_RELEASED';

export interface HomeworkInfo {
  id: number;
  title: string;
  givenTs: string;
  dueTs: string;
  feedbackReleaseTs: string;
  courseId: string;
  courseInstance: string;
  css: FTML.Css[];
  problems: Record<string, FTMLProblemWithSolution>;
}

export type HomeworkStub = Omit<HomeworkInfo, 'problems'>;

export interface LearnerHomeworkInfo {
  id: number;
  title: string;
  givenTs: string;
  dueTs: string;
  courseId: string;
  courseInstance: string;
  maxPoints: number;
  myScore: number;
  avgScore: number;
}

export interface HomeworkStatsInfo {
  totalStudentAttend: number;
  responseRate: { [attemptedProblems: number]: number };
  gradingStates: GradingState[];
  answerHistogram: { questionId: string; answerCount: number }[];
  averageStudentScore: AverageStudentScore[];
}

export interface GradingState {
  questionId: string;
  graded: number;
  ungraded: number;
  partiallyGraded: number;
}

export interface AverageStudentScore {
  questionId: string;
  averageScore: number;
}
