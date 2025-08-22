import { FTML } from '@kwarc/ftml-viewer';
import {
  getDefiniedaInSection,
  getQueryResults,
  getSectionDependencies,
  getSparqlQueryForLoRelationToDimAndConceptPair,
  Language,
  ProblemData,
} from '@stex-react/api';
import { getParamFromUri } from '@stex-react/utils';
import { getProblemsBySection } from './get-course-problem-counts';
import { getFlamsServer } from '@kwarc/ftml-react';

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const categorizedProblemCache = new Map<
  string,
  {
    data: ProblemData[];
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

const conceptUrisForCourse = new Map<string, { data: string[]; timestamp: number }>();
async function getAllConceptUrisForCourse(
  courseId: string,
  courseNotesUri: string
): Promise<string[]> {
  if (conceptUrisForCourse.has(courseId)) {
    const cached = conceptUrisForCourse.get(courseId)!;
    if (isCacheValid(cached)) {
      console.log(`[CACHE HIT] Concept URIs for course ${courseId}`);
      return cached.data;
    }
  }
  const toc = (await getFlamsServer().contentToc({ uri: courseNotesUri }))?.[1] ?? [];

  const sectionUris = getSections(toc);
  const conceptUris = new Set<string>();

  for (const sectionUri of sectionUris) {
    const defidenda = await getDefiniedaInSection(sectionUri);
    defidenda.forEach((d) => conceptUris.add(d.conceptUri));

    const deps = await getSectionDependencies(sectionUri);
    deps.forEach((uri) => conceptUris.add(uri));
  }
  const conceptUrisArray = Array.from(conceptUris);
  conceptUrisForCourse.set(courseId, {
    data: conceptUrisArray,
    timestamp: Date.now(),
  });
  return conceptUrisArray;
}

const loRelationCache = new Map<string, { data: string[]; timestamp: number }>();

// async function getLoRelationConceptUris(problemUri: string): Promise<string[]> {
//    if (loRelationCache.has(problemUri)) {
//     const cached = loRelationCache.get(problemUri)!;
//     if (isCacheValid(cached)) {
//       return cached.data;
//     }
//   }
//   const query = getSparqlQueryForLoRelationToDimAndConceptPair(problemUri);
//   const result = await getQueryResults(query ?? '');

//   const conceptUris: string[] = [];
//   result?.results?.bindings.forEach((binding) => {
//     const raw = binding.relatedData?.value;
//     if (!raw) return;
//     const parts = raw.split('; ').map((p) => p.trim());
//     const poSymbolUris = parts
//       .filter((data) => data.startsWith('http://mathhub.info/ulo#po-symbol='))
//       .map((data) => decodeURIComponent(data.split('#po-symbol=')[1]));

//     conceptUris.push(...poSymbolUris);
//   });

//   return Array.from(new Set(conceptUris));
// }

async function getLoRelationConceptUris(problemUri: string): Promise<string[]> {
  if (loRelationCache.has(problemUri)) {
    const cached = loRelationCache.get(problemUri)!;
    if (isCacheValid(cached)) {
      console.log(`[CACHE HIT] LoRelations for ${problemUri}`);
      return cached.data;
    } else {
      console.log(`[CACHE EXPIRED] LoRelations for ${problemUri}`);
    }
  }

  console.log(`[CACHE MISS] LoRelations for ${problemUri} → fetching fresh`);

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

  const uniqueUris = Array.from(new Set(conceptUris));

  loRelationCache.set(problemUri, {
    data: uniqueUris,
    timestamp: Date.now(),
  });

  return uniqueUris;
}

const languageUrlMap: Record<string, Language> = {
  de: Language.Deutsch,
  en: Language.English,
  ar: Language.Arabic,
  bn: Language.Bengali,
  hi: Language.Hindi,
  fr: Language.French,
  ja: Language.Japanese,
  ko: Language.Korean,
  zh: Language.Mandarin,
  mr: Language.Marathi,
  fa: Language.Persian,
  pt: Language.Portuguese,
  ru: Language.Russian,
  es: Language.Spanish,
  ta: Language.Tamil,
  te: Language.Telugu,
  tr: Language.Turkish,
  ur: Language.Urdu,
  vi: Language.Vietnamese,
};

export async function getCategorizedProblems(
  courseId: string,
  sectionUri: string,
  courseNotesUri: string,
  userLanguages?: string | string[],
  forceRefresh = false
): Promise<ProblemData[]> {
  const cacheKey = sectionUri;

  if (!forceRefresh && categorizedProblemCache.has(cacheKey)) {
    const cached = categorizedProblemCache.get(cacheKey)!;
    if (isCacheValid(cached)) {
      return cached.data;
    }
  }
  const sectionLangCode = getParamFromUri(sectionUri, 'l') ?? 'en';
  const conceptUrisFromCourse = await getAllConceptUrisForCourse(courseId, courseNotesUri);
  const allProblems: string[] = await getProblemsBySection(sectionUri);
  const reverseLangMap: Record<string, string> = {};
  for (const [code, name] of Object.entries(languageUrlMap)) {
    reverseLangMap[name.toString()] = code;
  }

  const categorized: ProblemData[] = await Promise.all(
    allProblems.map(async (problemUri) => {
      const labels = await getLoRelationConceptUris(problemUri);
      const outOfSyllabusConcepts = labels.filter(
        (label) => !conceptUrisFromCourse.includes(label)
      );

      const category: 'syllabus' | 'adventurous' =
        outOfSyllabusConcepts.length === 0 ? 'syllabus' : 'adventurous';
      let showForeignLanguageNotice = false;
      let matchedLanguage: string | undefined;

      const problemLangCode = getParamFromUri(problemUri, 'l') ?? 'en';
      const problemLangEnum = languageUrlMap[problemLangCode];
      const problemLangName = problemLangEnum.toString();

      const normalizedUserLangs: string[] =
        typeof userLanguages === 'string'
          ? userLanguages.split(',').map((l) => reverseLangMap[l.trim()] || l.trim().toLowerCase())
          : Array.isArray(userLanguages)
          ? userLanguages.map((l) => reverseLangMap[l] || l.toLowerCase())
          : [];

      // keep syllabus always, just show notice if not in preference
      if (category === 'syllabus' && sectionLangCode !== problemLangCode) {
        if (normalizedUserLangs.includes(problemLangCode)) {
          showForeignLanguageNotice = true;
          matchedLanguage = problemLangName;
        }
      }

      return {
        problemId: problemUri,
        category,
        labels,
        showForeignLanguageNotice,
        matchedLanguage,
        outOfSyllabusConcepts: outOfSyllabusConcepts.length > 0 ? outOfSyllabusConcepts : undefined,
      } as ProblemData;
    })
  );
  categorizedProblemCache.set(cacheKey, {
    data: categorized,
    timestamp: Date.now(),
  });

  return categorized;
}
