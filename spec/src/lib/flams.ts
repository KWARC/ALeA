import { createSafeFlamsQuery, getParamFromUri, waitForNSeconds } from '@alea/utils';
import { FTML } from '@flexiformal/ftml';
import {
  ProblemFeedbackJson,
  batchGradeHex as flamsBatchGradeHex,
  learningObjects as flamsLearningObjects,
} from '@flexiformal/ftml-backend';
import axios from 'axios';

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

// Gets list of concepts and their definitions for multiple sections.
// Returns a 2D array where each inner array corresponds to the concepts/definitions for one URI.
export async function getDefiniedaInSections(uris: string[]): Promise<ConceptAndDefinition[][]> {
  if (uris.length === 0) {
    return [];
  }

  // Build VALUES clause for multiple URIs
  const uriValues = uris.map((uri) => `<${uri}>`).join(' ');
  const query = `SELECT DISTINCT ?uri ?q ?s WHERE { 
    VALUES ?uri { ${uriValues} }
    ?uri (ulo:contains|dc:hasPart)* ?q. 
    ?q ulo:defines ?s.
  }`;

  const sparqlResponse = await getQueryResults(query);

  // Group results by URI to create 2D array
  const resultsByUri = new Map<string, ConceptAndDefinition[]>();

  for (const binding of sparqlResponse?.results?.bindings || []) {
    const uri = binding['uri'].value;
    if (!resultsByUri.has(uri)) {
      resultsByUri.set(uri, []);
    }
    resultsByUri.get(uri)!.push({
      conceptUri: binding['s'].value,
      definitionUri: binding['q'].value,
    });
  }

  // Return results in the same order as input URIs
  return uris.map((uri) => resultsByUri.get(uri) || []);
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
    return resp.data as SparqlResponse;
  } catch (error) {
    console.error('Error executing SPARQL query:', error);
    throw error;
  }
}

async function getParameterizedQueryResults(
  parameterizedQuery: string,
  uriParams: Record<string, string | string[]>
) {
  const query = createSafeFlamsQuery(parameterizedQuery, uriParams);
  return await getQueryResults(query);
}

export async function getConceptDependencies(conceptUri: string) {
  const query = `SELECT DISTINCT ?dependency WHERE {
  ?loname rdf:type ulo:definition .
  ?loname ulo:defines <_uri_concept> .
  ?loname ulo:crossrefs ?dependency .
}`;
  const sparqlResponse = await getParameterizedQueryResults(query, {
    _uri_concept: conceptUri,
  });

  const dependencies: string[] = [];
  for (const binding of sparqlResponse.results?.bindings || []) {
    dependencies.push(binding['dependency'].value);
  }
  return dependencies;
}

export async function getDependenciesForSection(sectionUri: string) {
  const query = `SELECT DISTINCT ?s WHERE {
  <_uri_section> (ulo:contains|dc:hasPart)* ?p.
  ?p ulo:crossrefs ?s.
  MINUS {
    <_uri_section> (ulo:contains|dc:hasPart)* ?p.
    ?p ulo:defines ?s.
  }
}`;
  const sparqlResponse = await getParameterizedQueryResults(query, {
    _uri_section: sectionUri,
  });

  const dependencies: string[] = [];
  for (const binding of sparqlResponse.results?.bindings || []) {
    dependencies.push(binding['s'].value);
  }
  return dependencies;
}

// Gets section dependencies for multiple sections.
// Returns a 2D array where each inner array corresponds to the dependencies for one URI.
export async function getDependenciesForSections(sectionUris: string[]): Promise<string[][]> {
  if (sectionUris.length === 0) {
    return [];
  }

  // Build VALUES clause for multiple URIs
  const query = `SELECT DISTINCT ?uri ?s WHERE {
    VALUES ?uri { <_multiuri_section_uris> }
    ?uri (ulo:contains|dc:hasPart)* ?p.
    ?p ulo:crossrefs ?s.
    MINUS {
      ?uri (ulo:contains|dc:hasPart)* ?p.
      ?p ulo:defines ?s.
    }
  }`;
  const sparqlResponse = await getParameterizedQueryResults(query, {
    _multiuri_section_uris: sectionUris,
  });

  // Group results by URI to create 2D array
  const resultsByUri = new Map<string, string[]>();

  for (const binding of sparqlResponse?.results?.bindings || []) {
    const uri = binding['uri'].value;
    if (!resultsByUri.has(uri)) {
      resultsByUri.set(uri, []);
    }
    resultsByUri.get(uri)!.push(binding['s'].value);
  }

  // Return results in the same order as input URIs
  return sectionUris.map((uri) => resultsByUri.get(uri) || []);
}

export const ALL_DIM_CONCEPT_PAIR = ['objective', 'precondition'] as const;
export const ALL_NON_DIM_CONCEPT = ['crossrefs', 'specifies', 'defines', 'example-for'] as const;
export const ALL_LO_RELATION_TYPES = [...ALL_DIM_CONCEPT_PAIR, ...ALL_NON_DIM_CONCEPT] as const;

export type LoRelationToDimAndConceptPair = (typeof ALL_DIM_CONCEPT_PAIR)[number];
export type LoRelationToNonDimConcept = (typeof ALL_NON_DIM_CONCEPT)[number];
export type AllLoRelationTypes = (typeof ALL_LO_RELATION_TYPES)[number];

export async function getLoRelationToDimAndConceptPair(loUri: string) {
  if (!loUri) {
    console.error('URI is absent');
    return [];
  }
  const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX ulo: <http://mathhub.info/ulo#>

                SELECT ?learningObject ?relation ?obj1 (GROUP_CONCAT(CONCAT(STR(?relType), "=", STR(?obj2)); SEPARATOR="; ") AS ?relatedData)
                WHERE {
                        ?learningObject ?relation ?obj1 .
                        ?obj1 ?relType ?obj2 .
                        FILTER(!CONTAINS(STR(?obj2), "?term")).
                        FILTER(!CONTAINS(STR(?obj2), "?REF")).
                        FILTER(CONTAINS(STR(?learningObject), "_uri_learning_object")).
                        VALUES ?relation {
                                ulo:precondition
                                ulo:objective
                                }
                      }
                GROUP BY ?learningObject ?relation ?obj1 `;
  const results = await getParameterizedQueryResults(query, {
    _uri_learning_object: loUri,
  });
  return (
    results?.results?.bindings.map((binding) => ({
      learningObject: binding['learningObject']?.value,
      relation: binding['relation']?.value,
      obj1: binding['obj1']?.value,
      relatedData: binding['relatedData']?.value,
    })) ?? []
  );
}

export async function getLoRelationToNonDimConcept(loUri: string) {
  if (!loUri) {
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
                         FILTER(CONTAINS(STR(?learningObject), "_uri_learning_object")).
                         VALUES ?relation {
                                   ulo:crossrefs
                                   ulo:specifies
                                   ulo:defines
                                   ulo:example-for
                                   }
                              }`;
  const results = await getParameterizedQueryResults(query, {
    _uri_learning_object: loUri,
  });
  return (
    results?.results?.bindings.map((binding) => ({
      learningObject: binding['learningObject']?.value,
      relation: binding['relation']?.value,
      obj1: binding['obj1']?.value,
    })) ?? []
  );
}

export async function getProblemObjects(problemIdPrefix: string) {
  if (!problemIdPrefix) {
    console.error('Problem ID prefix is required');
    return null;
  }
  const query = `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX ulo: <http://mathhub.info/ulo#>

    SELECT DISTINCT ?learningObject
    WHERE {
      ?learningObject rdf:type ulo:problem .
      FILTER(CONTAINS(STR(?learningObject), "_uri_problem_id_prefix"))
    }
  `;
  const results = await getParameterizedQueryResults(query, {
    _uri_problem_id_prefix: problemIdPrefix,
  });
  return (
    results?.results?.bindings.map((binding) => ({
      learningObject: binding['learningObject']?.value,
    })) ?? []
  );
}

export async function getNonDimConcepts() {
  const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
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
  const results = await getQueryResults(query);
  return results?.results?.bindings.map((binding) => binding['x']?.value) ?? [];
}

export async function getDimConcepts() {
  const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
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

  const results = await getQueryResults(query);
  return results?.results?.bindings.map((binding) => binding['x']?.value) ?? [];
}

export async function getLearningObjectsWithSubstring(loSubStr: string, loTypes?: LoType[]) {
  if (!loSubStr || !loSubStr.trim()) return [];
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
      FILTER(CONTAINS(LCASE(STR(?lo)), "_uri_lo_sub_str")).
      FILTER(!CONTAINS(STR(?lo), "?term")).
      FILTER(!CONTAINS(STR(?lo), "?REF")).
    }
    ORDER BY ?hash
    LIMIT 300`;
  const results = await getParameterizedQueryResults(query, { _uri_lo_sub_str: loSubStr });
  return (
    results?.results?.bindings.map((binding) => ({
      uri: binding['lo']?.value,
      type: binding['type']?.value,
    })) ?? []
  );
}

function createConceptParamMapping(conceptUris: string[], prefix = '_uri_concept') {
  if (!conceptUris?.length) return {};
  return Array.from({ length: conceptUris.length }, (_, i) => i).reduce(
    (acc, i) => ({ ...acc, [`${prefix}${i}`]: conceptUris[i] }),
    {}
  );
}

export async function getNonDimConceptsAsLoRelation(
  conceptUris: string[],
  relations: LoRelationToNonDimConcept[],
  loTypes?: LoType[],
  loSubStr?: string
) {
  if (!conceptUris?.length && !loSubStr?.trim()) return;
  const uriConditions = conceptUris?.length
    ? conceptUris.map((uri, idx) => `CONTAINS(STR(?obj1), "_uri_concept${idx}")`).join(' || ')
    : 'false';
  const relationConditions = relations.map((relation) => `ulo:${relation}`).join(' ');
  const loTypesConditions =
    loTypes && loTypes.length > 0
      ? loTypes.map((loType) => `ulo:${loType}`).join(', ')
      : 'ulo:definition, ulo:problem, ulo:example, ulo:para, ulo:proposition';
  const loStringFilter = loSubStr ? `FILTER(CONTAINS(LCASE(STR(?lo)), "_uri_lo_sub_str")).` : '';

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

  const results = await getParameterizedQueryResults(query, {
    ...createConceptParamMapping(conceptUris),
    _uri_lo_sub_str: loSubStr ?? '',
  });
  return (
    results?.results?.bindings.map((binding) => ({
      uri: binding['lo']?.value,
      type: binding['type']?.value,
    })) ?? []
  );
}

export async function getDimConceptsAsLoRelation(
  conceptUris: string[],
  relations: LoRelationToDimAndConceptPair[],
  loTypes?: LoType[],
  loSubStr?: string
) {
  if (!conceptUris?.length && !loSubStr?.trim()) return [];
  const uriConditions = conceptUris?.length
    ? conceptUris.map((uri) => `CONTAINS(STR(?obj1),"${encodeURI(uri)}")`).join(' || ')
    : 'false';
  const relationConditions = relations.map((relation) => `ulo:${relation}`).join(' ');
  const loTypesConditions =
    loTypes && loTypes.length > 0
      ? loTypes.map((loType) => `ulo:${loType}`).join(', ')
      : 'ulo:definition, ulo:problem, ulo:example, ulo:para, ulo:proposition';
  const loStringFilter = loSubStr ? `FILTER(CONTAINS(LCASE(STR(?lo)), "_uri_lo_sub_str")).` : '';
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

  const results = await getParameterizedQueryResults(query, {
    ...createConceptParamMapping(conceptUris),
    _uri_lo_sub_str: loSubStr ?? '',
  });

  return (
    results?.results?.bindings.map((binding) => ({
      uri: binding['lo']?.value,
      type: binding['type']?.value,
    })) ?? []
  );
}

export async function getDefinitionsForConcept(conceptUri: string, lang: string) {
  const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX ulo: <http://mathhub.info/ulo#>
        SELECT DISTINCT ?loname WHERE {
  ?loname rdf:type ulo:definition .
  ?loname ulo:defines <_uri_concept> .
}`;
  const results = await getParameterizedQueryResults(query, {
    _uri_concept: conceptUri,
  });
  const allUris = results?.results?.bindings?.map((b) => b?.['loname']?.value) ?? [];
  return allUris.filter((u: string) => u.includes(`&l=${lang}`));
}
