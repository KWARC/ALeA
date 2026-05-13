import { FTML } from '@flexiformal/ftml';

export function addProblemSlot(prev: string[], problemId: string) {
  return prev.includes(problemId) ? prev : [...prev, problemId];
}

export function buildProblemResponse<T>(
  uri: string,
  items: T[],
  getSubProblemId: (item: T) => unknown,
  getAnswer: (item: T) => string
): FTML.ProblemResponse {
  const responses = [] as FTML.ProblemResponse['responses'];
  for (const item of items) {
    const idx = Number(getSubProblemId(item));
    if (Number.isFinite(idx)) {
      responses[idx] = {
        type: 'Fillinsol',
        value: getAnswer(item),
      };
    }
  }
  return { uri, responses };
}

export function findItemForProblemSlot<T>(
  items: T[],
  problemId: string,
  isSubProblem: boolean,
  problemSlotIds: string[],
  getSubProblemId: (item: T) => unknown
) {
  if (!isSubProblem && items.length === 1 && problemSlotIds.length === 0) return items[0];

  const direct = items.find((item) => String(getSubProblemId(item) ?? '').trim() === problemId);
  if (direct) return direct;

  const byRenderedIndex = items.find((item) => {
    const idx = Number(getSubProblemId(item));
    return Number.isFinite(idx) && problemSlotIds[idx] === problemId;
  });
  if (byRenderedIndex) return byRenderedIndex;

  const idx = problemSlotIds.indexOf(problemId);
  if (isSubProblem && idx >= 0 && items.length === problemSlotIds.length) return items[idx];
}
