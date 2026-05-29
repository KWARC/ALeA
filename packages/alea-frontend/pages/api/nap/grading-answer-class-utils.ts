import { CreateAnswerClassRequest } from '@alea/spec';

export const GRADING_ANSWER_CLASS_COLUMNS =
  'gradingId, answerClassId, points, isTrait, closed, title, description, count';

function isValidGradingAnswerClassItem(c: CreateAnswerClassRequest): boolean {
  if (typeof c.answerClassId !== 'string' || !c.answerClassId.trim()) return false;
  if (typeof c.closed !== 'boolean' || typeof c.isTrait !== 'boolean') return false;
  if (typeof c.title !== 'string' || typeof c.description !== 'string') return false;
  if (c.points == null || Number.isNaN(Number(c.points))) return false;
  if (c.count == null || c.count < 0) return false;
  return true;
}

export function normalizedValidAnswerClasses(
  answerClasses: CreateAnswerClassRequest[] | undefined
): CreateAnswerClassRequest[] | null {
  if (!Array.isArray(answerClasses)) return null;

  const filtered = answerClasses.filter((c) => (c?.count ?? 0) > 0);
  if (!filtered.length) return null;
  return filtered.every(isValidGradingAnswerClassItem) ? filtered : null;
}

export function totalGradingPoints(answerClasses: CreateAnswerClassRequest[]): number {
  return answerClasses.reduce((sum, c) => sum + c.count * c.points, 0);
}

export function buildGradingAnswerClassInsert(
  answerClasses: CreateAnswerClassRequest[],
  gradingId?: number
) {
  const gradingIdSql = gradingId === undefined ? 'LAST_INSERT_ID()' : '?';
  const rowPlaceholders = answerClasses.map(() => `(${gradingIdSql}, ?, ?, ?, ?, ?, ?, ?)`);
  const params = answerClasses.flatMap((c) => [
    ...(gradingId === undefined ? [] : [gradingId]),
    c.answerClassId,
    c.points,
    c.isTrait,
    c.closed,
    c.title,
    c.description,
    c.count,
  ]);

  return {
    columns: GRADING_ANSWER_CLASS_COLUMNS,
    placeholders: rowPlaceholders.join(', '),
    params,
  };
}
