import {
  getDefiniedaInSection,
  getSectionDependencies,
  getQueryResults,
  getSparqlQueryForLoRelationToDimAndConceptPair,
} from '@stex-react/api';
import { getProblemsBySection } from './get-course-problem-counts';
import { FTML } from '@kwarc/ftml-viewer';

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const categorizedProblemCache = new Map<
  string,
  {
    data: {
      problemId: string;
      category: 'syllabus' | 'adventurous';
      labels: string[];
    }[];
    timestamp: number;
  }
>();

function isCacheValid(cacheEntry: { timestamp: number }): boolean {
  return Date.now() - cacheEntry.timestamp < CACHE_TTL;
}

function getSections(tocElems: FTML.TOCElem[]): string[] {
  const sectionUris: string[] = [];
  for (const tocElem of tocElems) {
    if (tocElem.type === 'Section') sectionUris.push(tocElem.uri);
    if ('children' in tocElem) sectionUris.push(...getSections(tocElem.children));
  }
  return sectionUris;
}

async function getAllConceptUrisForCourse(courseToc: FTML.TOCElem[]): Promise<Set<string>> {
  const sectionUris = getSections(courseToc);
  const conceptUris = new Set<string>();

  for (const sectionUri of sectionUris) {
    const defidenda = await getDefiniedaInSection(sectionUri);
    defidenda.forEach((d) => conceptUris.add(d.conceptUri));

    const deps = await getSectionDependencies(sectionUri);
    deps.forEach((uri) => conceptUris.add(uri));
  }

  return conceptUris;
}

async function getLoRelationConceptUris(problemUri: string): Promise<string[]> {
  const query = getSparqlQueryForLoRelationToDimAndConceptPair(problemUri);
  const result = await getQueryResults(query ?? '');

  const conceptUris: string[] = [];
  result?.results?.bindings.forEach((binding) => {
    const raw = binding.relatedData?.value;
    if (!raw) return;
    const parts = raw.split('; ').map((p) => p.trim());
    const poSymbolUris = parts
      .filter((data) => data.startsWith('http://mathhub.info/ulo#po-symbol='))
      .map((data) => decodeURIComponent(data.split('#po-symbol=')[1]));

    conceptUris.push(...poSymbolUris);
  });

  return conceptUris;
}

export async function getCategorizedProblems(
  sectionUri: string,
  courseToc: FTML.TOCElem[],
  userLanguages?: string | string[],
  forceRefresh = false
): Promise<
  {
    problemId: string;
    category: 'syllabus' | 'adventurous';
    labels: string[];
  }[]
> {
  const cacheKey = sectionUri;

  if (!forceRefresh && categorizedProblemCache.has(cacheKey)) {
    const cached = categorizedProblemCache.get(cacheKey)!;
    if (isCacheValid(cached)) {
      return cached.data;
    }
  }
  const conceptUrisFromCourse = await getAllConceptUrisForCourse(courseToc);
  const allProblems: string[] = await getProblemsBySection(sectionUri);
  const categorized: {
    problemId: string;
    category: 'syllabus' | 'adventurous';
    labels: string[];
  }[] = await Promise.all(
    allProblems.map(async (problemUri) => {
      const labels = await getLoRelationConceptUris(problemUri);
      const isSyllabus = labels.some((label) => conceptUrisFromCourse.has(label));

      let category: 'syllabus' | 'adventurous' = isSyllabus ? 'syllabus' : 'adventurous';
      let showGermanNotice = false;

      if (category === 'syllabus' && problemUri.includes('l=de')) {
        if (userLanguages.includes('Deutsch')) {
          showGermanNotice = true;
        } else {
          category = 'adventurous';
        }
      }

      return { problemId: problemUri, category, labels, showGermanNotice };
    })
  );
  categorizedProblemCache.set(cacheKey, {
    data: categorized,
    timestamp: Date.now(),
  });

  return categorized;
}
