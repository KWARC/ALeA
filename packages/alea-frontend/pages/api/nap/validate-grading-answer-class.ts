import { CreateAnswerClassRequest } from '@alea/spec';

/** Allow empty `description` (e.g. gnotes feedback). `points` may be 0 or negative. */
export function isValidGradingAnswerClassItem(c: CreateAnswerClassRequest): boolean {
  if (typeof c.answerClassId !== 'string' || !c.answerClassId.trim()) return false;
  if (typeof c.closed !== 'boolean' || typeof c.isTrait !== 'boolean') return false;
  if (typeof c.title !== 'string' || typeof c.description !== 'string') return false;
  if (c.points == null || Number.isNaN(Number(c.points))) return false;
  if (c.count == null || c.count < 0) return false;
  return true;
}
