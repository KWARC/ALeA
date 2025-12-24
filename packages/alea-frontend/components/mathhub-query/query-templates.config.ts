import {
  ALL_DIM_CONCEPT_PAIR,
  ALL_NON_DIM_CONCEPT,
  LoRelationToDimAndConceptPair,
  LoRelationToNonDimConcept,
  TEMPL_GET_CONCEPT_DEPENDENCIES,
  TEMPL_GET_DEFINITIONS_FOR_CONCEPT,
  TEMPL_GET_DEPENDENCIES_FOR_SECTION,
  TEMPL_GET_DEPENDENCIES_FOR_SECTIONS,
  TEMPL_GET_DIM_CONCEPTS,
  TEMPL_GET_LO_RELATIONS_OF_TYPE_CONCEPT_AND_BLOOM_DIM as TEMPL_GET_LO_RELATIONS_OF_TYPE_CONCEPT_AND_BLOOM_DIM,
  TEMPL_GET_SIMPLE_LO_RELATIONS,
  TEMPL_GET_NON_DIM_CONCEPTS,
  TEMPL_GET_PROBLEM_OBJECTS_BY_SUBSTR,
  getDimConceptsAsLoRelationTempl,
  getLearningObjectsWithSubstringTempl,
  getNonDimConceptsAsLoRelationTempl,
} from '@alea/spec';

export type QueryTemplate = {
  name: string;
  query: string;
  defaultUriParams: Record<string, string | string[]>;
};

export const CONCEPT_URI0 =
  'http://mathhub.info?a=smglom/computing&p=mod&m=information-processing-system&s=information processing system';
export const CONCEPT_URI1 = 'http://mathhub.info?a=smglom/computing&p=mod&m=computer&s=computer';
export const SECTION_URI0 =
  'http://mathhub.info?a=courses/FAU/AI/course&p=intro/sec&d=whatisai&l=en&e=section';
export const SECTION_URI1 =
  'http://mathhub.info?a=courses/FAU/AI/course&p=intro/sec&d=aiexists&l=en&e=section';
export const DEFAULT_LEARNING_OBJECT_URI =
  'http://mathhub.info?a=voll-ki/ALeA&p=doc/mod&d=pythagoras-problem&l=en&e=problem';
export const DEFAULT_PROBLEM_ID_SUBSTR = 'pythag';

export const QUERY_TEMPLATES: QueryTemplate[] = [
  {
    name: 'Get definitional dependencies of a concept',
    query: TEMPL_GET_CONCEPT_DEPENDENCIES,
    defaultUriParams: { _uri_concept: CONCEPT_URI0 },
  },
  {
    name: 'Section Dependencies (single section)',
    query: TEMPL_GET_DEPENDENCIES_FOR_SECTION,
    defaultUriParams: { _uri_section: SECTION_URI0 },
  },
  {
    name: 'Section Dependencies (multiple sections)',
    query: TEMPL_GET_DEPENDENCIES_FOR_SECTIONS,
    defaultUriParams: {
      _multiuri_section_uris: [SECTION_URI0, SECTION_URI1],
    },
  },
  {
    name: 'Relations of a concept (of type concept-bloom dimension)',
    query: TEMPL_GET_LO_RELATIONS_OF_TYPE_CONCEPT_AND_BLOOM_DIM,
    defaultUriParams: { _uri_learning_object: DEFAULT_LEARNING_OBJECT_URI },
  },
  {
    name: 'Relation of a concept (simple relations)',
    query: TEMPL_GET_SIMPLE_LO_RELATIONS,
    defaultUriParams: {
      _uri_learning_object: DEFAULT_LEARNING_OBJECT_URI,
    },
  },
  {
    name: 'Problem Objects (uri substring match)',
    query: TEMPL_GET_PROBLEM_OBJECTS_BY_SUBSTR,
    defaultUriParams: {
      _uri_problem_id_substr: DEFAULT_PROBLEM_ID_SUBSTR,
    },
  },
  /*{
    name: 'Non-Dimensional Concepts',
    query: TEMPL_GET_NON_DIM_CONCEPTS,
    defaultUriParams: {},
  },
  {
    name: 'Dimensional Concepts',
    query: TEMPL_GET_DIM_CONCEPTS,
    defaultUriParams: {},
  },*/
  {
    name: 'Definitions for Concept',
    query: TEMPL_GET_DEFINITIONS_FOR_CONCEPT,
    defaultUriParams: {
      _uri_concept: CONCEPT_URI0,
    },
  },
  {
    name: 'Learning Objects with Substring',
    query: getLearningObjectsWithSubstringTempl(),
    defaultUriParams: {
      _uri_lo_sub_str: 'information',
    },
  },
  {
    name: 'Search objects related to a concept (via simple relations)',
    query: getNonDimConceptsAsLoRelationTempl(
      [CONCEPT_URI0],
      [...ALL_NON_DIM_CONCEPT] as LoRelationToNonDimConcept[],
      undefined,
      ''
    ),
    defaultUriParams: {
      _uri_param0: CONCEPT_URI0,
      _uri_lo_sub_str: '',
    },
  },
  {
    name: 'Search object related to a concept (via relations of type concept-bloom dimension)',
    query: getDimConceptsAsLoRelationTempl(
      [CONCEPT_URI0, CONCEPT_URI1],
      [...ALL_DIM_CONCEPT_PAIR] as LoRelationToDimAndConceptPair[],
      undefined,
      ''
    ),
    defaultUriParams: {
      _uri_param0: CONCEPT_URI0,
      _uri_param1: CONCEPT_URI1,
      _uri_lo_sub_str: '',
    },
  },
];
