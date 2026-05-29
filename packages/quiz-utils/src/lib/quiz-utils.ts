import { AnswerClass, Phase, QuizWithStatus } from '@alea/spec';
import { FTML, injectCss } from '@flexiformal/ftml';
import { getDocument } from '@flexiformal/ftml-backend';

interface GradingNoteApi {
  html?: string;
  answer_classes?: GradingNoteApiAnswerClass[];
}

interface GradingNoteApiAnswerClass {
  id: string;
  feedback?: string;
  description?: string;
  kind?: { type?: string; value?: number };
}

type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord | undefined {
  return v && typeof v === 'object' ? (v as UnknownRecord) : undefined;
}

function toArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v == null ? [] : [v];
}

function asNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function normalizeJsonPayload(payload: unknown): unknown {
  if (typeof payload !== 'string') return payload;
  const s = payload.trim();
  if (!s) return payload;
  try {
    return JSON.parse(s);
  } catch {
    return payload;
  }
}

function decodeFwdSlashesInQuery(uri: string): string {
  const qi = uri.indexOf('?');
  if (qi === -1) return uri;
  return `${uri.slice(0, qi + 1)}${uri.slice(qi + 1).replace(/%2F/gi, '/')}`;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function queryParamValue(uri: string, key: string): string {
  const queryStart = uri.indexOf('?');
  if (queryStart === -1) return '';
  const queryEnd = uri.indexOf('#', queryStart);
  const query = uri.slice(queryStart + 1, queryEnd === -1 ? undefined : queryEnd);
  for (const part of query.split('&')) {
    const [rawKey, ...rawValueParts] = part.split('=');
    if (safeDecodeURIComponent(rawKey ?? '') === key) {
      return safeDecodeURIComponent(rawValueParts.join('=') ?? '');
    }
  }
  return '';
}

function removeQueryParam(uri: string, key: string): string {
  const hashStart = uri.indexOf('#');
  const hash = hashStart === -1 ? '' : uri.slice(hashStart);
  const withoutHash = hashStart === -1 ? uri : uri.slice(0, hashStart);
  const queryStart = withoutHash.indexOf('?');
  if (queryStart === -1) return uri;

  const base = withoutHash.slice(0, queryStart);
  const query = withoutHash.slice(queryStart + 1);
  const keptParams = query
    .split('&')
    .filter((part) => part && safeDecodeURIComponent(part.split('=')[0] ?? '') !== key);
  return decodeFwdSlashesInQuery(
    `${base}${keptParams.length ? `?${keptParams.join('&')}` : ''}${hash}`
  );
}

function childElements(element: FTML.DocumentElement): FTML.DocumentElement[] {
  const value = Object.values(element)[0];
  if (Array.isArray(value)) return value as FTML.DocumentElement[];
  if (
    value &&
    typeof value === 'object' &&
    Array.isArray((value as { children?: unknown }).children)
  ) {
    return (value as { children: FTML.DocumentElement[] }).children;
  }
  return [];
}

const documentCache = new Map<string, Promise<FTML.DocumentData | undefined>>();

export function documentUriFromProblemUri(problemUri: FTML.DocumentElementUri): FTML.DocumentUri {
  return removeQueryParam(problemUri, 'e') as FTML.DocumentUri;
}

export function findProblemDataInDocument(
  document: FTML.DocumentData | undefined,
  problemUri: FTML.DocumentElementUri
): FTML.ProblemData | undefined {
  const targetUri = normalizeProblemId(problemUri);
  const targetElementId = queryParamValue(problemUri, 'e');

  function visit(elements: FTML.DocumentElement[] | undefined): FTML.ProblemData | undefined {
    for (const element of elements ?? []) {
      if ('Problem' in element) {
        const problem = element.Problem;
        const problemElementId = queryParamValue(problem.uri, 'e');
        if (
          normalizeProblemId(problem.uri) === targetUri ||
          (!!targetElementId && problemElementId === targetElementId)
        ) {
          return problem.data;
        }
      }
      const found = visit(childElements(element));
      if (found) return found;
    }
    return undefined;
  }

  return visit(document?.elements);
}

export async function getProblemDataFromDocument(
  problemUri: FTML.DocumentElementUri,
  document?: FTML.DocumentData
): Promise<FTML.ProblemData | undefined> {
  if (document) {
    return findProblemDataInDocument(document, problemUri);
  }

  const documentUri = documentUriFromProblemUri(problemUri);
  let documentPromise = documentCache.get(documentUri);
  if (!documentPromise) {
    documentPromise = getDocument({ uri: documentUri });
    documentCache.set(documentUri, documentPromise);
  }
  const fetchedDocument = await documentPromise;
  return findProblemDataInDocument(fetchedDocument, problemUri);
}

export async function getProblemPointsFromDocument(
  problemUri: FTML.DocumentElementUri,
  document?: FTML.DocumentData
): Promise<number | undefined> {
  return (await getProblemDataFromDocument(problemUri, document))?.points;
}

export function normalizeProblemId(id: string | undefined | null): string {
  const s = String(id ?? '').trim();
  if (!s) return '';
  try {
    return decodeURIComponent(s).replace(/\/+$/, '');
  } catch {
    return s.replace(/\/+$/, '');
  }
}

export function parseContentFragmentTuple(raw: unknown): { titleHtml: string; html: string } {
  if (!Array.isArray(raw)) return { titleHtml: '', html: '' };
  const css = Array.isArray(raw[1]) ? raw[1] : [];
  if (css.length) injectCss(css as FTML.Css[]);
  if (raw.length >= 3) {
    return {
      titleHtml: Array.isArray(raw[1]) ? '' : String(raw[1] ?? ''),
      html: String(raw[2] ?? ''),
    };
  }
  return { titleHtml: '', html: String(raw[1] ?? '') };
}

/**
 * URI for `gradingNotes({ uri })` using each part's real `subProblemId`.
 * Does not rewrite `e` to numbered slots (`problem/problem_1`, ...).
 *
 * - Empty / omit subproblem: base problem (`questionUri` only, decoded slashes in query).
 * - `subProblemId` is an absolute `http(s)` URL: use as the full grading-notes target.
 * - Otherwise: set `e=<subProblemId>` on `questionUri` (gnotes keyed by that id).
 */
export function gradingNotesRequestUriFromSubProblemId(
  questionUri: string,
  subProblemId: string | null | undefined
): string {
  const sp = String(subProblemId ?? '').trim();
  if (!sp) {
    return decodeFwdSlashesInQuery(questionUri);
  }
  if (/^https?:\/\//i.test(sp)) {
    return decodeFwdSlashesInQuery(sp);
  }
  try {
    const u = new URL(questionUri);
    u.searchParams.set('e', sp);
    return decodeFwdSlashesInQuery(u.href);
  } catch {
    return decodeFwdSlashesInQuery(questionUri);
  }
}

function mapGradingNoteApiAnswerClassToAnswerClass(ac: GradingNoteApiAnswerClass): AnswerClass {
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

function mapLooseGradingNoteAnswerClass(raw: unknown): AnswerClass | undefined {
  const rec = asRecord(raw);
  if (!rec) return undefined;
  const idVal = rec['id'] ?? rec['answerClassId'] ?? rec['className'] ?? rec['name'];
  const id = idVal == null ? '' : String(idVal).trim();
  if (!id) return undefined;

  const kind = asRecord(rec['kind']);
  const kindType =
    (typeof kind?.['type'] === 'string' && kind['type']) ||
    (typeof rec['type'] === 'string' && rec['type']) ||
    undefined;
  const isTrait = rec['isTrait'] === true || kindType === 'Trait';
  const title =
    (typeof rec['title'] === 'string' && rec['title']) ||
    (typeof rec['description'] === 'string' && rec['description']) ||
    id;
  const description =
    (typeof rec['feedback'] === 'string' && rec['feedback']) ||
    (typeof rec['explanation'] === 'string' && rec['explanation']) ||
    '';
  const closed =
    typeof rec['closed'] === 'boolean'
      ? rec['closed']
      : isTrait
      ? false
      : kindType === 'Class' || !kindType;

  return {
    className: id,
    title,
    description,
    points: asNumber(kind?.['value'] ?? rec['points'] ?? rec['point'] ?? rec['score']),
    isTrait,
    closed,
  };
}

function gradingNotesBlocks(payload: unknown): unknown[] {
  const normalized = normalizeJsonPayload(payload);
  if (Array.isArray(normalized)) return normalized;

  const rec = asRecord(normalized);
  if (!rec) return [];

  for (const key of ['data', 'notes', 'result'] as const) {
    const value = normalizeJsonPayload(rec[key]);
    if (Array.isArray(value)) return value;
  }
  return [normalized];
}

function extractAnswerClassesFromBlocks(blocks: unknown[]): AnswerClass[] {
  const out: AnswerClass[] = [];
  for (const block of blocks) {
    const rec = asRecord(block);
    if (!rec) continue;
    const rows = [
      ...toArray(rec['answer_classes']),
      ...toArray(rec['answerClasses']),
      ...toArray(rec['answer-classes']),
      ...toArray(rec['classes']),
    ];
    for (const row of rows) {
      const mapped = mapLooseGradingNoteAnswerClass(row);
      if (mapped) {
        out.push(mapped);
        continue;
      }
      if (row && typeof row === 'object') {
        out.push(mapGradingNoteApiAnswerClassToAnswerClass(row as GradingNoteApiAnswerClass));
      }
    }
  }
  return mergeAnswerClassesByClassName([], out);
}

/** Parse `gradingNotes()` responses defensively across the formats returned by old and new gnotes endpoints. */
export function answerClassesFromLooseGradingNotesPayload(
  payload: unknown,
  subProblemId?: string
): AnswerClass[] {
  const blocks = gradingNotesBlocks(payload);
  if (!blocks.length) return [];

  const direct = extractAnswerClassesFromBlocks(blocks);
  if (direct.length) return direct;

  const sp = String(subProblemId ?? '')
    .trim()
    .toLowerCase();
  const spNorm = normalizeProblemId(subProblemId).toLowerCase();
  const matchedBlocks = blocks.filter((block) => {
    try {
      const txt = JSON.stringify(block).toLowerCase();
      return (!!sp && txt.includes(sp)) || (!!spNorm && txt.includes(spNorm));
    } catch {
      return false;
    }
  });

  const fromMatched = extractAnswerClassesFromBlocks(matchedBlocks);
  if (fromMatched.length) return fromMatched;

  let notes = answerClassesFromGradingNotesPayload(blocks as GradingNoteApi[], subProblemId);
  if (!notes.length && spNorm) {
    notes = answerClassesFromGradingNotesPayload(
      blocks as GradingNoteApi[],
      normalizeProblemId(subProblemId)
    );
  }
  return notes.length ? notes : answerClassesFromGradingNotesPayload(blocks as GradingNoteApi[]);
}

function answerClassesFromGradingNotesPayload(
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
 * `className`). Gnotes often restate defaults under new ids -> duplicate "Correct, but..." rows.
 */
export function omitAnswerClassesDuplicatingDefaultRadioTitles(
  extras: AnswerClass[]
): AnswerClass[] {
  const radioTitleKeys = new Set(
    DEFAULT_ANSWER_CLASSES.filter((d) => !d.isTrait).map((d) => answerClassRadioTitleKey(d.title))
  );
  return extras.filter((c) => c.isTrait || !radioTitleKeys.has(answerClassRadioTitleKey(c.title)));
}
