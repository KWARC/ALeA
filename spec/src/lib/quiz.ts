import { FTML } from '@flexiformal/ftml';

export enum Phase {
  UNSET = 'UNSET',
  NOT_STARTED = 'NOT_STARTED',
  STARTED = 'STARTED',
  ENDED = 'ENDED',
  FEEDBACK_RELEASED = 'FEEDBACK_RELEASED',
}

export interface RecorrectionInfo {
  problemUri: string;
  problemHeader?: string;
  recorrectedTs: string; // ISO string
  description: string;
}

export interface FTMLProblemWithSolution {
  problem: FTMLProblemWithSubProblems;
  answerClasses: AnswerClass[];
  solution?: string;
}

export interface FTMLProblemWithSubProblems extends FTML.QuizProblem {
  subProblems?: SubProblemData[];
}

export interface QuizWithStatus {
  id: string;
  version: number;

  courseId: string;
  courseTerm: string;
  quizStartTs: number;
  quizEndTs: number;
  feedbackReleaseTs: number;
  manuallySetPhase: Phase;

  title: string;
  problems: Record<string, FTMLProblemWithSolution>;
  css: FTML.Css[];

  recorrectionInfo?: RecorrectionInfo[];

  updatedAt: number;
  updatedBy: string;
}

export enum Tristate {
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  UNKNOWN = 'UNKNOWN',
}

export interface SubProblemData {
  solution: string;
  id: string;
  answerClasses: AnswerClass[];
}
export interface AnswerClass {
  className: string;
  points: number;
  title: string;
  closed: boolean;
  isTrait: boolean;
  description: string;
}

export interface Problem {
  header: string;
  objectives: string;
  preconditions: string;
  statement: { outerHTML: string };
  points: number;
  subProblemData: SubProblemData[];
}

export interface PerProblemStats {
  header: string;
  maxPoints: number;
  satisfactory: number;
  pass: number;
  fail: number;
  avgQuotient: number;
}

export interface QuizStatsResponse {
  attemptedHistogram: { [attempted: number]: number };
  scoreHistogram: { [scoreBucket: string]: number };
  requestsPerSec: { [ts: number]: number };
  perProblemStats: { [problemId: number]: PerProblemStats };
  totalStudents: number;
}

// For recording quizzes at /quiz/old
export interface TimerEvent {
  type: TimerEventType;
  timestamp_ms: number;
  problemIdx?: number;
}

export enum TimerEventType {
  SWITCH = 'SWITCH',
  PAUSE = 'PAUSE',
  UNPAUSE = 'UNPAUSE',
  SUBMIT = 'SUBMIT',
}

export interface ProblemInfo {
  duration_ms: number;
  url: string;
  points: number | undefined;
  response: FTML.ProblemResponse;
}

export interface QuizResult {
  resultId: string;
  quizName: string;
  quizTakerName: string;
  events: TimerEvent[];
  duration_ms: number;
  problemInfo: ProblemInfo[];
}

export interface GetQuizResponse {
  courseId: string;
  courseTerm: string;

  currentServerTs: number;
  quizStartTs?: number;
  quizEndTs?: number;
  feedbackReleaseTs?: number;

  phase: Phase;
  css: FTML.Css[];

  problems: { [problemId: string]: FTMLProblemWithSolution };
  responses: { [problemId: string]: FTML.ProblemResponse };
}

export interface InsertAnswerRequest {
  quizId: string;
  problemId: string;
  responses: FTML.ProblemResponse;

  browserTimestamp_ms: number;
}

export interface DiligenceAndPerformanceData {
  quizInfo: {
    [quizId: string]: {
      quizScore?: number;
      visitTime_sec?: number;
    };
  };
}
export interface UserAnonData {
  userData: { [userId: string]: DiligenceAndPerformanceData };
  quizzes: QuizWithStatus[];
}

export interface QuizStubInfo {
  quizId: string;
  quizStartTs: number;
  quizEndTs: number;
  title: string;
  css: FTML.Css[];
}

export function getTotalElapsedTime(events: TimerEvent[]) {
  if (!events?.length) return 0;
  console.assert(events[0].type === TimerEventType.SWITCH);
  let isPaused = false;
  let lastStartTime_ms: undefined | number = events[0].timestamp_ms;
  let totalTime = 0;
  for (const e of events) {
    switch (e.type) {
      case TimerEventType.PAUSE:
      case TimerEventType.SUBMIT:
        isPaused = true;
        if (lastStartTime_ms) totalTime += e.timestamp_ms - lastStartTime_ms;
        lastStartTime_ms = undefined;
        break;
      case TimerEventType.UNPAUSE:
        isPaused = false;
        lastStartTime_ms = e.timestamp_ms;
        break;
      case TimerEventType.SWITCH:
        isPaused = false;
        if (!lastStartTime_ms) lastStartTime_ms = e.timestamp_ms;
        break;
    }
  }
  if (!isPaused && lastStartTime_ms) {
    totalTime += Date.now() - lastStartTime_ms;
  }
  return totalTime;
}

export function getElapsedTime(events: TimerEvent[], problemIdx: number) {
  if (!events?.length) return 0;
  console.assert(events[0].type === TimerEventType.SWITCH);
  let isPaused = false;
  let lastStartTime_ms: undefined | number = events[0].timestamp_ms;
  let totalTime = 0;
  let currentProblemIdx = events[0].problemIdx;
  for (const e of events) {
    const wasThisProblem = currentProblemIdx === problemIdx;
    switch (e.type) {
      case TimerEventType.PAUSE:
      case TimerEventType.SUBMIT:
        isPaused = true;
        if (wasThisProblem && lastStartTime_ms) totalTime += e.timestamp_ms - lastStartTime_ms;
        lastStartTime_ms = undefined;
        break;
      case TimerEventType.UNPAUSE:
        isPaused = false;
        if (wasThisProblem) lastStartTime_ms = e.timestamp_ms;
        break;
      case TimerEventType.SWITCH:
        isPaused = false;
        if (wasThisProblem) {
          if (lastStartTime_ms) totalTime += e.timestamp_ms - lastStartTime_ms;
          lastStartTime_ms = undefined;
        }
        if (e.problemIdx === problemIdx) lastStartTime_ms = e.timestamp_ms;
        currentProblemIdx = e.problemIdx;
    }
  }
  if ((!problemIdx || currentProblemIdx === problemIdx) && !isPaused && lastStartTime_ms) {
    totalTime += Date.now() - lastStartTime_ms;
  }
  return totalTime;
}

export interface GetPreviousQuizInfoResponse {
  quizInfo: { [quizId: string]: PreviousQuizInfo };
}

export interface PreviousQuizInfo {
  score: number;
  averageScore: number;
  maxPoints: number;
  recorrectionInfo?: RecorrectionInfo[];
}
export interface Excused {
  userId: string;
  quizId: string;
  courseId: string;
  courseInstance: string;
}
