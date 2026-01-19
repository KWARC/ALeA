import axios, { AxiosError } from 'axios';
import { LoType } from './flams';

export type CognitiveValueConfidence = NumericCognitiveValues;

export interface LMPEvent {
  learner?: string; // The user id.
  time?: string; // Format: '2022-11-24 19:19:18'
  payload?: string; // Any string with arbitrary extra information to be used internally.
  comment?: string; // Any string with arbitrary extra information to show the learner.
}

export interface AnswerUpdateEntry {
  concept: string;
  dimensions: string[];
  quotient: number;
}

export interface ProblemAnswerEvent extends LMPEvent {
  type: 'problem-answer';
  uri: string; // The problem uri (eg. http://mathhub.info/iwgs/quizzes/creative_commons_21.tex)
  score?: number; // The score of the learner.
  'max-points'?: number; // The maximum points of the problem.
  updates?: AnswerUpdateEntry[];
}

export interface CourseInitEvent extends LMPEvent {
  type: 'course-init';
  course: string; // The course id.
  grade?: string; // "1" to "5"
  percentage?: string; // "0" to "100"
}

export interface IKnowEvent extends LMPEvent {
  type: 'i-know';
  // For i-know (a.k.a I understand)
  concept?: string;
}

export interface SelfAssessmentEvent extends LMPEvent {
  type: 'self-assessment';
  concept: string;
  competences: NumericCognitiveValues;
}

export interface SelfAssessmentSmileysEvent extends LMPEvent {
  type: 'self-assessment-5StepLikertSmileys';
  concept: string;
  competences: SmileyCognitiveValues;
}

export interface PurgeEvent extends LMPEvent {
  type: 'purge';
}

export interface ConceptClickedEvent extends LMPEvent {
  type: 'concept-clicked';
  concept: string;
}

export interface ConceptHoveredEvent extends LMPEvent {
  type: 'concept-hovered';
  concept: string;
}

export interface DefiniendumReadEvent extends LMPEvent {
  type: 'definiendum-read';
  concept: string;
}

export interface ViewEvent extends LMPEvent {
  type: 'view';
  concept: string;
}

export interface LoginEvent extends LMPEvent {
  type: 'login';
}

export interface LmpOutputMultipleRequest {
  concepts: string[];
  'special-output'?: string;
  'include-confidence'?: boolean;
}

export interface ConceptCompetenceInfo {
  concept: string; // URI
  competences: GenericCognitiveValues;
  confidences?: CognitiveValueConfidence;
}

export interface LmpOutputMultipleResponse {
  learner: string;
  model: ConceptCompetenceInfo[];
}

export async function getUriWeights(concepts: string[]): Promise<NumericCognitiveValues[]> {
  if (!concepts?.length) return [];
  console.log(`Getting weights for ${concepts.length} concepts`);
  const data: LmpOutputMultipleResponse = await lmpRequest(
    'lmp',
    'lmp/output/multiple',
    'POST',
    null,
    {
      concepts,
      'include-confidence': false,
    } as LmpOutputMultipleRequest
  );
  if (!data?.model) return new Array(concepts.length).fill({});

  const compMap = new Map<string, NumericCognitiveValues>();
  data.model.forEach((c) => {
    compMap.set(c.concept, cleanupNumericCognitiveValues(c.competences as NumericCognitiveValues));
  });
  return concepts.map((concept) => compMap.get(concept) || cleanupNumericCognitiveValues({}));
}
export async function getUriSmileyInternal(data: LmpOutputMultipleResponse, concepts: string[]) {
  const compMap = new Map<string, SmileyCognitiveValues>();
  if (!data?.model) return compMap;
  data.model.forEach((c) => {
    compMap.set(c.concept, cleanupSmileyCognitiveValues(c.competences as SmileyCognitiveValues));
  });

  concepts.map((concept) => {
    if (!compMap.has(concept)) compMap.set(concept, cleanupSmileyCognitiveValues({}));
  });
  return compMap;
}

export async function getUriSmileys(
  concepts: string[]
): Promise<Map<string, SmileyCognitiveValues>> {
  if (!concepts?.length) return new Map();
  const data: LmpOutputMultipleResponse = await lmpRequest(
    'lmp',
    'lmp/output/multiple',
    'POST',
    null,
    {
      concepts,
      'special-output': '5StepLikertSmileys',
      'include-confidence': false,
    }
  );
  return getUriSmileyInternal(data, concepts);
}

export async function getAllMyData(): Promise<{
  learner: string;
  model: ConceptCompetenceInfo[];
  logs: {
    answers: ProblemAnswerEvent[];
    'course-inits': CourseInitEvent[];
    'i-knows': IKnowEvent[];
    logins: LoginEvent[];
    purges: PurgeEvent[];
    'self-assessments': SelfAssessmentEvent | SelfAssessmentSmileysEvent[];
    views: any[];
  };
}> {
  return await lmpRequest('lmp', 'lmp/output/all_my_data', 'POST', {}, {});
}

export async function getMyModel(): Promise<{
  learner: string;
  model: ConceptCompetenceInfo[];
}> {
  return await lmpRequest('lmp', 'lmp/output/my_model', 'POST', {}, {});
}

export async function getMyCompleteModel(): Promise<ConceptCompetenceInfo[]> {
  return (await getMyModel())?.model || [];
}

export async function purgeAllMyData() {
  await lmpRequest('lmp', 'lmp/input/events', 'POST', {}, {
    type: 'purge',
  } as PurgeEvent);
}

export async function reportEvent(event: LMPEvent) {
  return await lmpRequest('lmp', 'lmp/input/events', 'POST', {}, event);
}

export type SmileyType = 'smiley-2' | 'smiley-1' | 'smiley0' | 'smiley1' | 'smiley2';

export type SmileyLevel = -2 | -1 | 0 | 1 | 2;
export const ALL_SMILEY_LEVELS: SmileyLevel[] = [-2, -1, 0, 1, 2];

export function uriWeightToSmileyLevel(weight: number) {
  if (weight < 0.2) return -2;
  if (weight < 0.4) return -1;
  if (weight < 0.6) return 0;
  if (weight < 0.8) return 1;
  return 2;
}
export function smileyToLevel(smiley?: SmileyType): SmileyLevel | undefined {
  if (!smiley) return undefined;
  if (smiley === 'smiley-2') return -2;
  if (smiley === 'smiley-1') return -1;
  if (smiley === 'smiley0') return 0;
  if (smiley === 'smiley1') return 1;
  if (smiley === 'smiley2') return 2;
  return -2;
}

export interface NumericCognitiveValues {
  Remember?: number;
  Understand?: number;
  Apply?: number;
  Analyse?: number;
  Evaluate?: number;
  Create?: number;
}
export interface SmileyCognitiveValues {
  Remember?: SmileyType;
  Understand?: SmileyType;
  Apply?: SmileyType;
  Analyse?: SmileyType;
  Evaluate?: SmileyType;
  Create?: SmileyType;
}

export interface GenericCognitiveValues {
  Remember?: number | SmileyType;
  Understand?: number | SmileyType;
  Apply?: number | SmileyType;
  Analyse?: number | SmileyType;
  Evaluate?: number | SmileyType;
  Create?: number | SmileyType;
}

export enum BloomDimension {
  Remember = 'Remember',
  Understand = 'Understand',
  Apply = 'Apply',
  Analyse = 'Analyse',
  Evaluate = 'Evaluate',
  Create = 'Create',
}

export const ALL_DIMENSIONS = [
  BloomDimension.Remember,
  BloomDimension.Understand,
  BloomDimension.Apply,
  BloomDimension.Analyse,
  BloomDimension.Evaluate,
  BloomDimension.Create,
];

export const SHOW_DIMENSIONS = ALL_DIMENSIONS.slice(0, 3);
export interface UserInfo {
  userId: string;
  givenName: string;
  sn: string;
  fullName: string;
  issued: number;
}

const FAKE_USER_DEFAULT_COMPETENCIES: { [id: string]: string[] } = {
  blank: [],
  abc: ['http://mathhub.info/smglom/sets/mod?set'],
  joy: ['http://mathhub.info/smglom/complexity/mod?timespace-complexity'],
  sabrina: [
    'http://mathhub.info/smglom/complexity/mod?timespace-complexity',
    'http://mathhub.info/smglom/sets/mod?formal-language',
    'http://mathhub.info/smglom/mv/mod?structure?mathematical-structure',
  ],
  anushka: ['http://mathhub.info/smglom/mv/mod?structure?mathematical-structure'],
};

export async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  location.reload();
}

export async function logoutAndGetToLoginPage() {
  await fetch('/api/logout', { method: 'POST' });
  const redirectUrl = `/login?target=${encodeURIComponent(window.location.href)}`;
  window.location.replace(redirectUrl);
}

export function loginUsingRedirect(returnBackUrl?: string) {
  if (!returnBackUrl) returnBackUrl = window.location.href;

  // Check if we need cross-domain auth
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const nonFauDomain = process.env['NEXT_PUBLIC_NON_FAU_DOMAIN'];
  if (currentHost === nonFauDomain) {
    // Redirect to FAU domain for cross-domain auth
    const fauDomain = process.env['NEXT_PUBLIC_FAU_DOMAIN'];
    const crossDomainAuthUrl = `https://${fauDomain}/cross-domain-auth/init?target=${encodeURIComponent(
      returnBackUrl
    )}`;
    window.location.replace(crossDomainAuthUrl);
    return;
  }

  const redirectUrl = `${process.env['NEXT_PUBLIC_AUTH_SERVER_URL']}/login?target=${encodeURIComponent(returnBackUrl)}`;

  window.location.replace(redirectUrl);
}

export function fakeLoginUsingRedirect(
  fakeId: string,
  name: string | undefined,
  returnBackUrl: string | undefined,
  persona?: string
) {
  if (!name && !persona) {
    axios.get(`/api/fake-login/${fakeId}`).then(() => {
      window.location.replace(returnBackUrl || '/');
    });
    return;
  }
  if (!returnBackUrl) returnBackUrl = window.location.href;
  fakeId = fakeId.replace(/\W/g, '');
  const encodedReturnBackUrl = encodeURIComponent(returnBackUrl);
  const target = persona
    ? encodeURIComponent(
        window.location.origin +
          `/reset-and-redirect?redirectPath=${encodedReturnBackUrl}&persona=${persona}`
      )
    : encodedReturnBackUrl;
  const n = name || fakeId;

  const redirectUrl =
    `${process.env['NEXT_PUBLIC_AUTH_SERVER_URL']}/fake-login?fake-id=${fakeId}&target=${target}` +
    (name ? `&name=${n}` : '');

  window.location.replace(redirectUrl);
}

export async function lmpRequest(
  server: 'lmp' | 'auth',
  apiUrl: string,
  requestType: string,
  defaultVal: any,
  data?: any
) {
  try {
    const resp = await axios.post(`/api/lmp-redirect`, {
      server,
      apiUrl,
      requestType,
      defaultVal,
      data,
    });
    return resp.data;
  } catch (err) {
    const error = err as Error | AxiosError;
    console.error('LMP Request Unauthorized:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        logoutAndGetToLoginPage();
      }
    }
  }
}

export function cleanupNumericCognitiveValues(dim: NumericCognitiveValues): NumericCognitiveValues {
  return {
    Remember: +(dim.Remember || 0),
    Understand: +(dim.Understand || 0),
    Apply: +(dim.Apply || 0),
    Analyse: +(dim.Analyse || 0),
    Evaluate: +(dim.Evaluate || 0),
    Create: +(dim.Create || 0),
  };
}

export function cleanupSmileyCognitiveValues(dim: SmileyCognitiveValues): SmileyCognitiveValues {
  const defaultSmiley = 'smiley-2';
  return {
    Remember: dim.Remember || defaultSmiley,
    Understand: dim.Understand || defaultSmiley,
    Apply: dim.Apply || defaultSmiley,
    Analyse: dim.Analyse || defaultSmiley,
    Evaluate: dim.Evaluate || defaultSmiley,
    Create: dim.Create || defaultSmiley,
  };
}
interface UserInfoLms {
  user_id: string;
  given_name: string;
  sn: string;
  issued: number;
}
export function lmpResponseToUserInfo(lmpRespData: UserInfoLms): UserInfo | undefined {
  if (!lmpRespData) return undefined;
  return {
    userId: lmpRespData.user_id,
    givenName: lmpRespData.given_name,
    sn: lmpRespData.sn,
    fullName: `${lmpRespData.given_name ?? ''} ${lmpRespData.sn ?? ''}`,
    issued: lmpRespData.issued,
  };
}

let cachedUserInfo: UserInfo | undefined = undefined;
export async function getUserInfo() {
  if (!cachedUserInfo) {
    const v = await lmpRequest('auth', 'getuserinfo', 'GET', undefined);
    if (!v) return undefined;
    cachedUserInfo = lmpResponseToUserInfo(v);
  }
  return cachedUserInfo;
}

export async function resetFakeUserData(persona: string) {
  const userInfo = await getUserInfo();
  const userId = userInfo?.userId;
  if (!userId || !userId.startsWith('fake')) return;
  if (!(persona in FAKE_USER_DEFAULT_COMPETENCIES)) {
    alert(`No defaults found for ${persona}`);
    return;
  }
  const URIs = FAKE_USER_DEFAULT_COMPETENCIES[persona];
  await purgeAllMyData();
  for (const URI of URIs) {
    await reportEvent({
      type: 'self-assessment-5StepLikertSmileys',
      concept: URI,
      competences: {
        Remember: 'smiley2',
        Understand: 'smiley2',
        Apply: 'smiley2',
      },
    } as SelfAssessmentSmileysEvent);
  }
  alert(`User reset: ${userId} with persona: ${persona}`);
}

export type HistoryEventType =
  | CourseInitEvent
  | IKnowEvent
  | SelfAssessmentEvent
  | SelfAssessmentSmileysEvent
  | PurgeEvent
  | ProblemAnswerEvent;

export interface HistoryItem {
  event: HistoryEventType;
  'new-values': NumericCognitiveValues;
}
export interface ConceptHistory {
  learner: string;
  concept: string;
  history: HistoryItem[];
}

export async function getConceptHistory(concept: string): Promise<ConceptHistory> {
  return await lmpRequest('lmp', 'lmp/output/history', 'POST', null, {
    concept,
  });
}

export async function postAnswerToLMP(answer: ProblemAnswerEvent) {
  return await lmpRequest('lmp', '/lmp/input/events', 'POST', null, answer);
}

export interface GetLearningObjectsResponse {
  'learning-objects': { 'learning-object': string; type: LoType }[];
  learner: string;
}

export async function getLearningObjects(
  concepts: string[],
  limit?: number,
  types?: string[],
  exclude?: string[],
  preMinCompetence?: {
    remember: number;
    understand: number;
  },
  objMaxCompetence?: {
    remember: number;
    understand: number;
  }
) {
  return (await lmpRequest('lmp', 'guided-tours/learning-objects', 'POST', null, {
    concepts,
    limit,
    types,
    exclude,
    'pre-min-competence': preMinCompetence,
    'obj-max-competence': objMaxCompetence,
  })) as GetLearningObjectsResponse;
}

export interface GetLeafConceptsResponse {
  'leaf-concepts': string[];
  learner: string;
}

export async function getLeafConcepts(target: string) {
  return (await lmpRequest('lmp', 'guided-tours/leaf-concepts', 'POST', null, {
    target,
  })) as GetLeafConceptsResponse;
}

export async function updateLearnerModel(updatePayload: SelfAssessmentEvent) {
  const userInfo = await getUserInfo();
  const userId = userInfo?.userId;

  return await lmpRequest('lmp', 'lmp/input/events', 'POST', null, {
    ...updatePayload,
    learner: userId,
  });
}
