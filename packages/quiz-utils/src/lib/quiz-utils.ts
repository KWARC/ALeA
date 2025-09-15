import { AnswerClass, Phase,QuizWithStatus } from '@alea/spec';
import { FTML } from '@kwarc/ftml-viewer';


export const PROBLEM_PARSED_MARKER = 'problem-parsed';

export function fillInValueToStartEndNum(value: string) {
  value = value.trim();
  if (value.startsWith('[')) value = value.slice(1);
  if (value.endsWith(']')) value = value.slice(0, -1);
  if (value.includes(',')) value = value.replace(',', '-');

  // Remove spaces from the range string
  const cleanedRange = value.replace(/\s/g, '');

  const regex = /^(-?[\d.]+)?-(-?[\d.]+)?$/;
  const match = cleanedRange.match(regex);

  if (!match) return { startNum: undefined, endNum: undefined };
  return { startNum: parseFloat(match[1]), endNum: parseFloat(match[2]) };
}

export function getQuizPhase(q: QuizWithStatus) {
  if (q.manuallySetPhase && q.manuallySetPhase !== Phase.UNSET) {
    return q.manuallySetPhase;
  }
  const now = Date.now();
  if (now < q.quizStartTs) return Phase.NOT_STARTED;
  if (now < q.quizEndTs) return Phase.STARTED;
  if (now < q.feedbackReleaseTs) return Phase.ENDED;
  return Phase.FEEDBACK_RELEASED;
}

export function isEmptyResponse(response: FTML.ProblemResponse) {
  for (const r of response.responses) {
    if (r.type === 'Fillinsol') {
      if (r.value.trim().length > 0) return false;
    } else if (r.type === 'MultipleChoice') {
      if (r.value.length > 0 && r.value.some((v) => v)) return false;
    } else if (r.type === 'SingleChoice') {
      if (r.value !== undefined && r.value !== null) return false;
    }
  }
  return true;
}

export const DEFAULT_ANSWER_CLASSES: Readonly<AnswerClass[]> = [
  {
    className: 'ac-default-01',
    title: 'Entirely correct',
    description: "Student's answer is correct and complete regarding all aspects.",
    points: 1000,
    closed: true,
    isTrait: false,
  },
  {
    className: 'ac-default-02',
    title: 'Entirely wrong',
    description: "Student's answer is completely unrelated to expected answers.",
    points: 0,
    closed: true,
    isTrait: false,
  },
  {
    className: 'ac-default-06',
    title: 'Correct, but...',
    description: "Student's answer is mostly correct.",
    isTrait: false,
    points: 1000,
    closed: false,
  },
  {
    className: 'ac-default-07',
    title: 'Wrong, but...',
    description: "Student's answer is mostly wrong.",
    isTrait: false,
    points: 0,
    closed: false,
  },
  {
    className: 'ac-default-09',
    title: 'Minor errors',
    description: "Student's answer contains minor errors.",
    closed: false,
    isTrait: true,
    points: -0.5,
  },
  {
    className: 'ac-default-10',
    title: 'Argumentation flawed',
    description: "Student's argumentation is unsound/imprecise.",
    closed: false,
    isTrait: true,
    points: -0.5,
  },
  {
    className: 'ac-default-11',
    title: 'Syntax errors',
    description: 'Student uses syntax incorrectly.',
    closed: false,
    isTrait: true,
    points: -0.5,
  },
  {
    className: 'ac-default-12',
    title: 'Formal errors',
    description: "Student's answer misses formal requirements.",
    closed: false,
    isTrait: true,
    points: -0.5,
  },
] as const;
