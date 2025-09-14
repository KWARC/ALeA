import { getFlamsServer } from '@kwarc/ftml-react';
import { FTML } from '@kwarc/ftml-viewer';
import {
  getDefiniedaInSection,
  getQueryResults,
  getSectionDependencies,
  getSparqlQueryForLoRelationToDimAndConceptPair,
  Language,
  ProblemData,
} from '@alea/spec';
import { getParamFromUri } from '@alea/utils';
import { getProblemsBySection } from './get-course-problem-counts';

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const CONCEPT_URIS_FOR_COURSE = new Map<string, { data: string[]; timestamp: number }>();
const LO_RELATION_CACHE = new Map<string, { data: string[]; timestamp: number }>();

function isCacheValid(cacheEntry: { timestamp: number } | undefined): boolean {
  return cacheEntry && Date.now() - cacheEntry.timestamp < CACHE_TTL;
}

function getSections(tocElems: FTML.TOCElem[]): string[] {
  const sectionUris: string[] = [];
  for (const tocElem of tocElems) {
    if (tocElem.type === 'Section') sectionUris.push(tocElem.uri);
    if ('children' in tocElem) sectionUris.push(...getSections(tocElem.children));
  }
  return sectionUris;
}

async function getAllConceptUrisForCourse(
  courseId: string,
  courseNotesUri: string
): Promise<string[]> {
  const cached = CONCEPT_URIS_FOR_COURSE.get(courseId);
  if (isCacheValid(cached)) return cached.data;

  const toc = (await getFlamsServer().contentToc({ uri: courseNotesUri }))?.[1] ?? [];

  const sectionUris = getSections(toc);
  const conceptUris = new Set<string>();

  for (const sectionUri of sectionUris) {
    const defidenda = await getDefiniedaInSection(sectionUri);
    defidenda.forEach((d) => conceptUris.add(d.conceptUri));

    const deps = await getSectionDependencies(sectionUri);
    deps.forEach((uri) => conceptUris.add(uri));
  }
  const conceptUrisArray = Array.from(conceptUris).map((uri) => {
    // HACK: Figure out why some concept URIs have %20 instead of space
    // In the meantime, replace all instances of %20 with space
    return uri.replace(/%20/g, ' ');
  });
  CONCEPT_URIS_FOR_COURSE.set(courseId, {
    data: conceptUrisArray,
    timestamp: Date.now(),
  });
  return conceptUrisArray;
}

async function getLoRelationConceptUris(problemUri: string): Promise<string[]> {
  const cached = LO_RELATION_CACHE.get(problemUri);
  if (isCacheValid(cached)) return cached.data;

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

  LO_RELATION_CACHE.set(problemUri, {
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
  userLanguages: Language[],
): Promise<ProblemData[]> {
  const sectionLangCode = getParamFromUri(sectionUri, 'l') ?? 'en';
  const conceptUrisFromCourse = await getAllConceptUrisForCourse(courseId, courseNotesUri);
  const allProblems: string[] = await getProblemsBySection(sectionUri);

  const categorized: ProblemData[] = await Promise.all(
    allProblems.map(async (problemUri) => {
      const labels = await getLoRelationConceptUris(problemUri);
      const outOfSyllabusConcepts = labels.filter(
        (label) => !conceptUrisFromCourse.includes(label)
      );

      let category: 'syllabus' | 'adventurous' =
        outOfSyllabusConcepts.length === 0 ? 'syllabus' : 'adventurous';
      let showForeignLanguageNotice = false;
      let matchedLanguage: string | undefined;

      const problemLangCode = getParamFromUri(problemUri, 'l') ?? 'en';

      if (category === 'syllabus' && sectionLangCode !== problemLangCode) {
        const problemLang = languageUrlMap[problemLangCode];
        if (userLanguages?.includes(problemLang)) {
          showForeignLanguageNotice = true;
          matchedLanguage = problemLang;
        } else {
          category = 'adventurous';
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
  return categorized;
}
