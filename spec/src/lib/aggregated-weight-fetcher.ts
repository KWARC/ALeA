import { from, lastValueFrom, map } from 'rxjs';
import { getUriWeights, NumericCognitiveValues } from './lmp';
import { RequestAggregator } from './request-aggregator';

const WEIGHTS_CACHE = new Map<string, NumericCognitiveValues>();
const WEIGHTS_FETCHER = new RequestAggregator<string, NumericCognitiveValues[]>(
  undefined,
  (u1: string, u2: string) => u1 === u2,
  (uri: string) => uri,
  (uri: string) => uri,
  (uris: string[]) => from(getUriWeights(uris)),
  (weights: NumericCognitiveValues[], requests: string[]) => {
    for (let i = 0; i < requests.length; i++) {
      WEIGHTS_CACHE.set(requests[i], weights[i]);
    }
  }
);

export function clearWeightsCache() {
  WEIGHTS_CACHE.clear();
}

export function invalidateWeightsCache(concepts: string[]) {
  for (const concept of concepts) {
    WEIGHTS_CACHE.delete(concept);
  }
}

export async function getLmpUriWeightsAgg(concept: string): Promise<NumericCognitiveValues> {
  const alreadyCached = WEIGHTS_CACHE.get(concept);
  if (alreadyCached) return alreadyCached;
  return await lastValueFrom(
    WEIGHTS_FETCHER.informWhenReady([concept]).pipe(map((_) => WEIGHTS_CACHE.get(concept) || {}))
  );
}


export async function getLmpUriWeightsAggBulk(concepts: string[]): Promise<NumericCognitiveValues[]> {
  return await Promise.all(concepts.map(getLmpUriWeightsAgg));
}