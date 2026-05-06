import { AnswerClass, GradingInfo, Phase, QuizWithStatus } from '@alea/spec';
import { FTML } from '@flexiformal/ftml';

/** One row from `content/gnotes` (grading notes) for a problem or subproblem. */
export interface GradingNoteApi {
  html?: string;
  answer_classes?: GradingNoteApiAnswerClass[];
}

export interface GradingNoteApiAnswerClass {
  id: string;
  feedback?: string;
  description?: string;
  kind?: { type?: string; value?: number };
}

/** Grading gnotes: API `description` → title, `feedback` → description; `kind` → points / Trait vs Class. */
export function mapGradingNoteApiAnswerClassToAnswerClass(
  ac: GradingNoteApiAnswerClass
): AnswerClass {
  const kindType = ac.kind?.type;
  const isTrait = kindType === 'Trait';
  return {
    className: ac.id,
    title: (ac.description ?? ac.id).trim() || ac.id,
    description: (ac.feedback ?? '').trim(),
    points: ac.kind?.value ?? 0,
    isTrait,
    closed: isTrait ? false : kindType === 'Class' || kindType == null,
  };
}

/** Parse `gradingNotes()` JSON; with multiple blocks, prefer one related to `subProblemId`. */
export function answerClassesFromGradingNotesPayload(
  notes: GradingNoteApi[] | null | undefined,
  subProblemId?: string
): AnswerClass[] {
  if (!Array.isArray(notes) || notes.length === 0) return [];
  const sp = subProblemId != null && subProblemId !== '' ? String(subProblemId) : '';
  const entry =
    notes.length === 1
      ? notes[0]
      : sp
        ? notes.find((n) => n.html?.includes(sp)) ||
          notes.find((n) => n.answer_classes?.some((a) => String(a.id).includes(sp))) ||
          notes[0]
        : notes[0];
  const raw = entry?.answer_classes;
  if (!Array.isArray(raw)) return [];
  return raw.map(mapGradingNoteApiAnswerClassToAnswerClass);
}

/** Merge with stable order: problem/FTML first, then gnotes; first wins on duplicate `className`. */
export function mergeAnswerClassesByClassName(
  fromProblem: AnswerClass[],
  fromGradingNotes: AnswerClass[]
): AnswerClass[] {
  const seen = new Set<string>();
  const out: AnswerClass[] = [];
  for (const c of [...fromProblem, ...fromGradingNotes]) {
    if (seen.has(c.className)) continue;
    seen.add(c.className);
    out.push(c);
  }
  return out;
}

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
  for (const r of response.responses ?? []) {
    if (r.type === 'Fillinsol') {
      if (r.value.trim().length > 0) return false;
    } else if (r.type === 'MultipleChoice') {
      const v = r.value ?? [];
      if (v.length > 0 && v.some((x) => x)) return false;
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

/** Normalize title for deduping defaults vs gnotes (plain text, ignores simple HTML wrappers). */
export function answerClassRadioTitleKey(title: string): string {
  const plain = String(title ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return plain;
}

/**
 * Drops extra answer classes whose *radio* label duplicates a built-in default (same title, different
 * `className`). Gnotes often restate defaults under new ids → duplicate "Correct, but..." rows.
 */
export function omitAnswerClassesDuplicatingDefaultRadioTitles(extras: AnswerClass[]): AnswerClass[] {
  const radioTitleKeys = new Set(
    DEFAULT_ANSWER_CLASSES.filter((d) => !d.isTrait).map((d) =>
      answerClassRadioTitleKey(d.title)
    )
  );
  return extras.filter(
    (c) => c.isTrait || !radioTitleKeys.has(answerClassRadioTitleKey(c.title))
  );
}

/** Rows stored on a grading whose `answerClassId` is missing from the template (after defaults + notes). */
export function appendAnswerClassesFromGradingRows(
  template: AnswerClass[],
  grading: GradingInfo | undefined
): AnswerClass[] {
  const radioTitleKeys = new Set(
    DEFAULT_ANSWER_CLASSES.filter((d) => !d.isTrait).map((d) =>
      answerClassRadioTitleKey(d.title)
    )
  );
  const rows = grading?.answerClasses;
  if (!rows?.length) return template;
  const seen = new Set(template.map((c) => c.className));
  const extras: AnswerClass[] = [];
  for (const row of rows) {
    const id = row.answerClassId;
    if (!id || seen.has(id)) continue;
    const title = (row.title || row.description || id).trim();
    if (!row.isTrait && radioTitleKeys.has(answerClassRadioTitleKey(title))) continue;
    seen.add(id);
    extras.push({
      className: id,
      title: (row.title || row.description || id).trim(),
      description: row.description ?? '',
      points: row.points,
      isTrait: !!row.isTrait,
      closed: !!row.closed,
    });
  }
  return [...template, ...extras];
}
