import type { StudyBuddyDbExecutor } from '@alea/node-utils';
import { executeQueryAndEnd } from './comment-utils';

type QueryResultWithError = {
  error?: unknown;
};

function hasQueryError(result: unknown): result is QueryResultWithError {
  return (
    typeof result === 'object' &&
    result !== null &&
    'error' in result &&
    (result as QueryResultWithError).error !== undefined
  );
}

async function executeStudyBuddyQuery<T>(query: string, values: unknown[]): Promise<T> {
  const result = await executeQueryAndEnd<T | QueryResultWithError>(query, values as any[]);
  if (hasQueryError(result)) throw result.error;
  return result as T;
}

export const aleaStudyBuddyDb: StudyBuddyDbExecutor = {
  query: executeStudyBuddyQuery,
  execute: executeStudyBuddyQuery,
};
