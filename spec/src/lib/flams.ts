import { COURSES_INFO, getParamFromUri, waitForNSeconds } from '@alea/utils';
import { FTML } from '@flexiformal/ftml';
import {
  ArchiveIndex,
  Institution,
  ProblemFeedbackJson,
  batchGradeHex as flamsBatchGradeHex,
  index as flamsIndex,
  learningObjects as flamsLearningObjects,
} from '@flexiformal/ftml-backend';
import axios from 'axios';
import { CourseQuizAndHomeworkInfo, getCourseHomeworkAndQuizInfo, getCourseIdsByUniversity } from './course-metadata-api';

export async function batchGradeHex(
  submissions: [string, (FTML.ProblemResponse | undefined)[]][]
): Promise<ProblemFeedbackJson[][] | undefined> {
  return await flamsBatchGradeHex(...submissions);
}

export function computePointsFromFeedbackJson(
  problem: FTML.QuizProblem,
  feedbackJson?: { score_fraction: number }
) {
  const fraction = feedbackJson?.score_fraction;
  if (fraction === undefined || fraction === null) return NaN;
  return fraction * (problem.total_points ?? 1);
}

export enum DocIdxType {
  course = 'course',
  library = 'library',
  book = 'book',
  university = 'university',
}
export interface Person {
  name: string;
}

let CACHED_ARCHIVE_INDEX: ArchiveIndex[] | undefined = undefined;
let CACHED_INSTITUTION_INDEX: Institution[] | undefined = undefined;

const courseHomeworkQuizCache = new Map<string, CourseQuizAndHomeworkInfo>();

async function getCachedCourseHomeworkAndQuizInfo(
  courseId: string,
  instanceId?: string
): Promise<CourseQuizAndHomeworkInfo> {
  const cacheKey = courseId;
  if (courseHomeworkQuizCache.has(cacheKey)) {
    return courseHomeworkQuizCache.get(cacheKey)!;
  }
  const result = await getCourseHomeworkAndQuizInfo(courseId, instanceId);
  courseHomeworkQuizCache.set(cacheKey, result);
  return result;
}

export function clearCourseHomeworkQuizCache(): void {
  courseHomeworkQuizCache.clear();
}

export async function getDocIdx(institution?: string) {
  if (!CACHED_ARCHIVE_INDEX) {
    const res = await flamsIndex();
    if (res) {
      CACHED_INSTITUTION_INDEX = res[0] as Institution[];
      CACHED_ARCHIVE_INDEX = res[1] as ArchiveIndex[];
    }
  }
  const archiveIndex = CACHED_ARCHIVE_INDEX || [];
  const institutionIndex = CACHED_INSTITUTION_INDEX || [];

  if (!institution) {
    return [...archiveIndex, ...institutionIndex];
  }

  const filteredArchiveIndex = archiveIndex.filter(
    (doc) => doc.type === 'course' && doc.institution === institution
  );

  return [...filteredArchiveIndex, ...institutionIndex];
}

export async function getCourseIdsOfSemester(semester: string, universityId?: string): Promise<string[]> {
  if (universityId) {
    try {
      return await getCourseIdsByUniversity(universityId, semester);
    } catch (error) {
      // Fall back to old behavior if courseMetadata fetch fails
    }
  }
  
  return Object.entries(COURSES_INFO)
    .filter(([, info]) => info.instances?.some((i) => i.semester === semester))
    .map(([courseId]) => courseId.toLowerCase());
}

export async function getCourseInfo(institution?: string) {
  /*  const filtered = { ...COURSES_INFO };

  // Don't show Luka's course on production.
  if (process.env['NEXT_PUBLIC_SITE_VERSION'] === 'production') {
    delete filtered['f29fa1'];
  }
  return filtered;*/
  // try {
  //   const docIdx = await getDocIdx(institution);
  //   const courseInfo: { [courseId: string]: CourseInfo } = {};
  //   for (const doc of docIdx) {
  //     if (doc.type !== DocIdxType.course) continue;
  //     if (!doc.acronym || !doc.landing || !doc.notes) continue;
  //     doc.acronym = doc.acronym.toLowerCase();

  //     const isCurrent = doc.instances?.some((i) => i.semester === CURRENT_TERM);
  //     courseInfo[doc.acronym] = createCourseInfo(
  //       doc.acronym,
  //       doc.title,
  //       doc.notes,
  //       doc.landing,
  //       isCurrent,
  //       true,
  //       ['lbs', 'ai-1', 'iwgs-1'].includes(doc.acronym) ? true : doc.quizzes ?? false,
  //       doc.institution,
  //       doc.instances,
  //       doc.instructors,
  //       doc.teaser,
  //       doc.slides
  //     );
  //   }
  //   console.log('Fetched course info from FLAMS:', courseInfo);
  //   return courseInfo;
  // } catch (err) {
  //   console.log(err);
  //   return COURSES_INFO;
  // }
  return COURSES_INFO;
}

export function getFTMLForConceptView(conceptUri: string) {
  const name = getParamFromUri(conceptUri, 's') ?? conceptUri;
  return `<span data-ftml-term="OMID" data-ftml-head="${conceptUri}" data-ftml-comp>${name}</span>`;
}

export interface ConceptAndDefinition {
  conceptUri: string;
  definitionUri: string;
}

// Gets list of concepts and their definition in a section.
export async function getDefiniedaInSection(uri: string): Promise<ConceptAndDefinition[]> {
  const query = `SELECT DISTINCT ?q ?s WHERE { <${uri}> (ulo:contains|dc:hasPart)* ?q. ?q ulo:defines ?s.}`;

  const sparqlResponse = await getQueryResults(query);
  return (
    sparqlResponse?.results?.bindings.map((card) => ({
      conceptUri: card['s'].value,
      definitionUri: card['q'].value,
    })) || []
  );
}

export async function getProblemsForConcept(conceptUri: string) {
  const MAX_RETRIES = 3;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const learningObjects = await flamsLearningObjects({ uri: conceptUri }, true);
      if (!learningObjects) return [];
      return learningObjects.filter((obj) => obj[1].type === 'Problem').map((obj) => obj[0]);
    } catch (error) {
      console.warn('Error fetching problems for:', conceptUri);
      await waitForNSeconds(2 * i * i);
    }
  }
  console.error(`After ${MAX_RETRIES} failed to fetch problems for: [${conceptUri}] `);
  return [];
}

export async function getProblemsForSection(sectionUri: string): Promise<string[]> {
  const concepts = await getDefiniedaInSection(sectionUri);
  const conceptUris = concepts.map((item) => item.conceptUri);
  const uniqueProblemUrls = new Set<string>();
  await Promise.all(
    conceptUris.map(async (conceptUri) => {
      const problems = await getProblemsForConcept(conceptUri);
      problems.forEach((problem) => {
        uniqueProblemUrls.add(problem);
      });
    })
  );
  return Array.from(uniqueProblemUrls);
}

export function conceptUriToName(uri: string) {
  if (!uri) return uri;
  return getParamFromUri(uri, 's') ?? uri;
}
//////////////////
// :query/sparql
//////////////////

export const ALL_LO_TYPES = [
  'para', // synomym: symdoc
  'definition',
  'problem',
  'example',
  'statement', // synomym: assertion => now changed to ulo:proposition
] as const;
export type LoType = (typeof ALL_LO_TYPES)[number];
export interface SparqlResponse {
  head?: {
    vars: string[];
  };
  results?: {
    bindings: Record<string, { type: string; value: string }>[];
  };
}

export async function getQueryResults(query: string) {
  try {
    const resp = await axios.post(
      `${process.env['NEXT_PUBLIC_FLAMS_URL']}/api/backend/query`,
      { query },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );
    return JSON.parse(resp.data) as SparqlResponse;
  } catch (error) {
    console.error('Error executing SPARQL query:', error);
    throw error;
  }
}
export async function getConceptDependencies(conceptUri: string) {
  const query = `SELECT DISTINCT ?dependency WHERE {
  ?loname rdf:type ulo:definition .
  ?loname ulo:defines <${conceptUri}> .
  ?loname ulo:crossrefs ?dependency .
}`;
  const sparqlResponse = await getQueryResults(query);

  const dependencies: string[] = [];
  for (const binding of sparqlResponse.results?.bindings || []) {
    dependencies.push(binding['dependency'].value);
  }
  return dependencies;
}

export async function getSectionDependencies(sectionUri: string) {
  const query = `SELECT DISTINCT ?s WHERE {
  <${sectionUri}> (ulo:contains|dc:hasPart)* ?p.
  ?p ulo:crossrefs ?s.
  MINUS {
    <${sectionUri}> (ulo:contains|dc:hasPart)* ?p.
    ?p ulo:defines ?s.
  }
}`;
  const sparqlResponse = await getQueryResults(query);

  const dependencies: string[] = [];
  for (const binding of sparqlResponse.results?.bindings || []) {
    dependencies.push(binding['s'].value);
  }
  return dependencies;
}

export const ALL_DIM_CONCEPT_PAIR = ['objective', 'precondition'] as const;
export const ALL_NON_DIM_CONCEPT = ['crossrefs', 'specifies', 'defines', 'example-for'] as const;
export const ALL_LO_RELATION_TYPES = [...ALL_DIM_CONCEPT_PAIR, ...ALL_NON_DIM_CONCEPT] as const;

export type LoRelationToDimAndConceptPair = (typeof ALL_DIM_CONCEPT_PAIR)[number];
export type LoRelationToNonDimConcept = (typeof ALL_NON_DIM_CONCEPT)[number];
export type AllLoRelationTypes = (typeof ALL_LO_RELATION_TYPES)[number];

export const getSparqlQueryForLoRelationToDimAndConceptPair = (uri: string) => {
  if (!uri) {
    console.error('URI is absent');
    return;
  }
  const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX ulo: <http://mathhub.info/ulo#>

                SELECT ?learningObject ?relation ?obj1 (GROUP_CONCAT(CONCAT(STR(?relType), "=", STR(?obj2)); SEPARATOR="; ") AS ?relatedData)
                WHERE {
                        ?learningObject ?relation ?obj1 .
                        ?obj1 ?relType ?obj2 .
                        FILTER(!CONTAINS(STR(?obj2), "?term")).
                        FILTER(!CONTAINS(STR(?obj2), "?REF")).
                        FILTER(CONTAINS(STR(?learningObject), "${encodeURI(uri)}")).
                        VALUES ?relation {
                                ulo:precondition
                                ulo:objective
                                }
                      }
                GROUP BY ?learningObject ?relation ?obj1 `;
  return query;
};

export const getSparqlQueryForLoRelationToNonDimConcept = (uri: string) => {
  if (!uri) {
    console.error('URI is absent');
    return;
  }
  const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX ulo: <http://mathhub.info/ulo#>

                SELECT ?learningObject ?relation ?obj1
                WHERE {
                        ?learningObject ?relation ?obj1 .
                        FILTER(!CONTAINS(STR(?obj1), "?term")).
                        FILTER(!CONTAINS(STR(?obj1), "?REF")).
                         FILTER(CONTAINS(STR(?learningObject), "${encodeURI(uri)}")).
                         VALUES ?relation {
                                   ulo:crossrefs
                                   ulo:specifies
                                   ulo:defines
                                   ulo:example-for
                                   }
                              }`;
  return query;
};
export const getProblemObject = async (problemIdPrefix: string) => {
  if (!problemIdPrefix) {
    console.error('Problem ID prefix is required');
    return null;
  }
  return `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX ulo: <http://mathhub.info/ulo#>

    SELECT DISTINCT ?learningObject
    WHERE {
      ?learningObject rdf:type ulo:problem .
      FILTER(CONTAINS(STR(?learningObject), "${encodeURI(problemIdPrefix)}"))
    }
  `;
};

export function getSparlQueryForNonDimConcepts() {
  return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX ulo: <http://mathhub.info/ulo#>

SELECT DISTINCT ?x
WHERE {
  ?lo ?type ?x.
  ?lo rdf:type ?loType.

  FILTER(!CONTAINS(STR(?x), "?term")).
  FILTER(!CONTAINS(STR(?x), "?REF")).
  FILTER(?type IN (ulo:crossrefs, ulo:defines, ulo:example-for, ulo:specifies)).
  FILTER(?loType IN (ulo:definition, ulo:problem, ulo:example, ulo:para, ulo:proposition)).
}
`;
}

export function getSparlQueryForDimConcepts() {
  return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX fn: <http://www.w3.org/2005/xpath-functions#>
PREFIX ulo: <http://mathhub.info/ulo#>

SELECT DISTINCT ?x
WHERE {
?lo ?type ?b.
?b ulo:po-symbol ?x.
?lo rdf:type ?loType .

 FILTER(!CONTAINS(STR(?x), "?term")).
 FILTER(!CONTAINS(STR(?x), "?REF")).
  FILTER(?type IN (ulo:objective ,ulo:precondition )).
  FILTER(?loType IN (ulo:definition, ulo:problem, ulo:example, ulo:para, ulo:proposition)).
}
`;
}

export function getSparqlQueryForLoString(loString: string, loTypes?: LoType[]) {
  if (!loString || !loString.trim()) return;
  const loTypesConditions =
    loTypes && loTypes.length > 0
      ? loTypes.map((loType) => `ulo:${loType}`).join(', ')
      : 'ulo:definition, ulo:problem, ulo:example, ulo:para, ulo:proposition';
  const query = `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX ulo: <http://mathhub.info/ulo#>
    PREFIX fn: <http://www.w3.org/2005/xpath-functions#>
    SELECT DISTINCT ?lo ?type (SHA256(STR(?lo)) AS ?hash)
    WHERE {
      ?lo rdf:type ?type .
      FILTER(?type IN (${loTypesConditions})).
      FILTER(CONTAINS(LCASE(STR(?lo)), "${encodeURI(loString)}")).
      FILTER(!CONTAINS(STR(?lo), "?term")).
      FILTER(!CONTAINS(STR(?lo), "?REF")).
    }
    ORDER BY ?hash
    LIMIT 300`;
  return query;
}

export function getSparqlQueryForNonDimConceptsAsLoRelation(
  conceptUris: string[],
  relations: LoRelationToNonDimConcept[],
  loTypes?: LoType[],
  loString?: string
) {
  if (!conceptUris?.length && (!loString || !loString.trim())) return;
  const uriConditions = conceptUris?.length
    ? conceptUris.map((uri) => `CONTAINS(STR(?obj1), "${encodeURI(uri)}")`).join(' || ')
    : 'false';
  const relationConditions = relations.map((relation) => `ulo:${relation}`).join(' ');
  const loTypesConditions =
    loTypes && loTypes.length > 0
      ? loTypes.map((loType) => `ulo:${loType}`).join(', ')
      : 'ulo:definition, ulo:problem, ulo:example, ulo:para, ulo:proposition';
  const loStringFilter = loString
    ? `FILTER(CONTAINS(LCASE(STR(?lo)), "${encodeURI(loString)}")).`
    : '';

  const query = `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX ulo: <http://mathhub.info/ulo#>

    SELECT DISTINCT ?lo ?type
    WHERE {
      {
        ?lo ?relation ?obj1 .
        FILTER(
          ${uriConditions}
        )
        VALUES ?relation {
          ${relationConditions}
        }
      }

      ?lo rdf:type ?type .
      FILTER(?type IN (${loTypesConditions})).
      ${loStringFilter}
      FILTER(!CONTAINS(STR(?lo), "?term")).
      FILTER(!CONTAINS(STR(?lo), "?REF")).

    }LIMIT 300
  `;

  return query;
}

export function getSparqlQueryForDimConceptsAsLoRelation(
  conceptUris: string[],
  relations: LoRelationToDimAndConceptPair[],
  loTypes?: LoType[],
  loString?: string
) {
  if (!conceptUris?.length && (!loString || !loString.trim())) return;
  const uriConditions = conceptUris?.length
    ? conceptUris.map((uri) => `CONTAINS(STR(?obj1),"${encodeURI(uri)}")`).join(' || ')
    : 'false';
  const relationConditions = relations.map((relation) => `ulo:${relation}`).join(' ');
  const loTypesConditions =
    loTypes && loTypes.length > 0
      ? loTypes.map((loType) => `ulo:${loType}`).join(', ')
      : 'ulo:definition, ulo:problem, ulo:example, ulo:para, ulo:proposition';
  const loStringFilter = loString
    ? `FILTER(CONTAINS(LCASE(STR(?lo)), "${encodeURI(loString)}")).`
    : '';
  const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX ulo: <http://mathhub.info/ulo#>

SELECT ?lo ?type
WHERE {
?lo ?relation  ?bn.
?bn ?re2 ?obj1.
 FILTER(${uriConditions}
    )
  VALUES ?relation {
          ${relationConditions}
        }
    ?lo rdf:type ?type .
      FILTER(?type IN (${loTypesConditions})).
      ${loStringFilter}
  FILTER(!CONTAINS(STR(?lo), "?term")).
  FILTER(!CONTAINS(STR(?lo), "?REF")).
}LIMIT 300
`;

  return query;
}

export function getSparlQueryForDefinition(uri: string) {
  return `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX ulo: <http://mathhub.info/ulo#>
        SELECT DISTINCT ?loname WHERE {
  ?loname rdf:type ulo:definition .
  ?loname ulo:defines <${uri}> .
}
  `;
}
