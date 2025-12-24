import { from, lastValueFrom, map } from 'rxjs';
import { ConceptAndDefinition, getDefiniedaInSections, getDependenciesForSections } from './flams';
import { RequestAggregator } from './request-aggregator';

const DEFINIENDA_IN_SECTION_CACHE = new Map<string, ConceptAndDefinition[]>();
const DEFINIENDA_IN_SECTION_FETCHER = new RequestAggregator<string, ConceptAndDefinition[][]>(
  undefined,
  (u1: string, u2: string) => u1 === u2,
  (uri: string) => uri,
  (uri: string) => uri,
  (uris: string[]) => from(getDefiniedaInSections(uris)),
  (weights: ConceptAndDefinition[][], requests: string[]) => {
    if(!weights) {
      console.error('No weights found for requests:', requests);
      return;
    }
    for (let i = 0; i < requests.length; i++) {
      DEFINIENDA_IN_SECTION_CACHE.set(requests[i], weights[i]);
    }
  }
);

export function clearDefiniedaInSectionCache() {
  DEFINIENDA_IN_SECTION_CACHE.clear();
}

export function invalidateDefiniedaInSectionCache(concepts: string[]) {
  for (const concept of concepts) {
    DEFINIENDA_IN_SECTION_CACHE.delete(concept);
  }
}

export async function getDefiniedaInSectionAgg(concept: string): Promise<ConceptAndDefinition[]> {
  const alreadyCached = DEFINIENDA_IN_SECTION_CACHE.get(concept);
  if (alreadyCached) return alreadyCached;
  return await lastValueFrom(
    DEFINIENDA_IN_SECTION_FETCHER.informWhenReady([concept]).pipe(
      map((_) => DEFINIENDA_IN_SECTION_CACHE.get(concept) || [])
    )
  );
}
////////////////////////////////////////////////////////

const DEPENDENCIES_FOR_SECTION_CACHE = new Map<string, string[]>();
const DEPENDENCIES_FOR_SECTION_FETCHER = new RequestAggregator<string, string[][]>(
  undefined,
  (u1: string, u2: string) => u1 === u2,
  (uri: string) => uri,
  (uri: string) => uri,
  (uris: string[]) => from(getDependenciesForSections(uris)),
  (weights: string[][], requests: string[]) => {
    for (let i = 0; i < requests.length; i++) {
      DEPENDENCIES_FOR_SECTION_CACHE.set(requests[i], weights[i]);
    }
  }
);

export function clearDependenciesForSectionCache() {
  DEPENDENCIES_FOR_SECTION_CACHE.clear();
}

export function invalidateDependenciesForSectionCache(sections: string[]) {
  for (const section of sections) {
    DEPENDENCIES_FOR_SECTION_CACHE.delete(section);
  }
}

export async function getDependenciesForSectionAgg(section: string): Promise<string[]> {
  const alreadyCached = DEPENDENCIES_FOR_SECTION_CACHE.get(section);
  if (alreadyCached) return alreadyCached;
  return await lastValueFrom(
    DEPENDENCIES_FOR_SECTION_FETCHER.informWhenReady([section]).pipe(
      map((_) => DEPENDENCIES_FOR_SECTION_CACHE.get(section) || [])
    )
  );
}