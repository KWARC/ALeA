import { CURRENT_TERM } from './courseInfo';

export enum Action {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  PREVIEW = 'PREVIEW',
  MUTATE = 'MUTATE',
  INSTRUCTOR_GRADING = 'INSTRUCTOR_GRADING',
  MODERATE = 'MODERATE',

  ACCESS_CONTROL = 'ACCESS_CONTROL',

  APPLY = 'APPLY',
  CREATE_JOB_POST = 'CREATE_JOB_POST',
  CREATE_JOB_TYPE = 'CREATE_JOB_TYPE',
  TAKE = 'TAKE',
}

export enum ResourceName {
  BLOG = 'BLOG',
  EXPERIMENTAL = 'EXPERIMENTAL',
  JOB_PORTAL = 'JOB_PORTAL',
  JOB_PORTAL_ORG = 'JOB_PORTAL_ORG',

  // Resources related to specific courses.
  COURSE_SYLLABUS = 'COURSE_SYLLABUS',
  COURSE_QUIZ = 'COURSE_QUIZ',
  COURSE_COMMENTS = 'COURSE_COMMENTS',
  COURSE_STUDY_BUDDY = 'COURSE_STUDY_BUDDY',
  COURSE_HOMEWORK = 'COURSE_HOMEWORK',
  COURSE_PEERREVIEW = 'COURSE_PEERREVIEW',
  // Resources related to all courses.
  ALL_COMMENTS = 'ALL_COMMENTS',
  ALL_STUDY_BUDDY = 'ALL_STUDY_BUDDY',

  // For managing access control updates only.
  GLOBAL_ACCESS = 'GLOBAL_ACCESS',
  COURSE_ACCESS = 'COURSE_ACCESS',
}

export enum ComponentType {
  FIXED = 'FIXED',
  VARIABLE = 'VARIABLE',

  WILDCARD1 = 'WILDCARD1',
  WILDCARD2 = 'WILDCARD2',
}

export const COURSE_SPECIFIC_RESOURCENAMES = [
  ResourceName.COURSE_SYLLABUS,
  ResourceName.COURSE_QUIZ,
  ResourceName.COURSE_COMMENTS,
  ResourceName.COURSE_STUDY_BUDDY,
  ResourceName.COURSE_HOMEWORK,
  ResourceName.COURSE_ACCESS,
];
export interface CourseResourceAction {
  courseId: string;
  name: ResourceName;
  actions: Action[];
}
export interface ResourceIdComponent {
  name?: string;
  type: ComponentType;
  value?: string;
}

export interface ResourceType {
  name: ResourceName;
  possibleActions: Action[];
  components: ResourceIdComponent[];
}

export interface ResourceActionPair {
  resourceId: string;
  actionId: string;
}

export const INSTRUCTOR_RESOURCE_AND_ACTION = [
  { resource: ResourceName.COURSE_SYLLABUS, action: Action.MUTATE },
  { resource: ResourceName.COURSE_QUIZ, action: Action.MUTATE },
  { resource: ResourceName.COURSE_STUDY_BUDDY, action: Action.MODERATE },
  { resource: ResourceName.COURSE_HOMEWORK, action: Action.MUTATE },
  { resource: ResourceName.COURSE_ACCESS, action: Action.ACCESS_CONTROL },
];

export const ALL_RESOURCE_TYPES: ResourceType[] = [
  {
    name: ResourceName.BLOG,
    possibleActions: [Action.MUTATE],
    components: [{ type: ComponentType.FIXED, value: 'blog' }],
  },
  {
    name: ResourceName.EXPERIMENTAL,
    possibleActions: [Action.MUTATE],
    components: [{ type: ComponentType.FIXED, value: 'experimental' }],
  },
  {
    name: ResourceName.COURSE_SYLLABUS,
    possibleActions: [Action.MUTATE],
    components: [
      { type: ComponentType.FIXED, value: 'course' },
      { name: 'courseId', type: ComponentType.VARIABLE },
      { type: ComponentType.FIXED, value: 'instance' },
      { name: 'instanceId', type: ComponentType.VARIABLE, value: CURRENT_TERM },
      { type: ComponentType.FIXED, value: 'syllabus' },
    ],
  },
  {
    name: ResourceName.COURSE_QUIZ,
    possibleActions: [Action.MUTATE, Action.PREVIEW, Action.TAKE],
    components: [
      { type: ComponentType.FIXED, value: 'course' },
      { name: 'courseId', type: ComponentType.VARIABLE },
      { type: ComponentType.FIXED, value: 'instance' },
      { name: 'instanceId', type: ComponentType.VARIABLE, value: CURRENT_TERM },
      { type: ComponentType.FIXED, value: 'quiz' },
    ],
  },
  {
    name: ResourceName.COURSE_COMMENTS,
    possibleActions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.MODERATE],
    components: [
      { type: ComponentType.FIXED, value: 'course' },
      { name: 'courseId', type: ComponentType.VARIABLE },
      { type: ComponentType.FIXED, value: 'instance' },
      { name: 'instanceId', type: ComponentType.VARIABLE, value: CURRENT_TERM },
      { type: ComponentType.FIXED, value: 'comments' },
    ],
  },
  {
    name: ResourceName.COURSE_PEERREVIEW,
    possibleActions: [Action.MUTATE],
    components: [
      { type: ComponentType.FIXED, value: 'course' },
      { name: 'courseId', type: ComponentType.VARIABLE },
      { type: ComponentType.FIXED, value: 'instance' },
      { name: 'instanceId', type: ComponentType.VARIABLE, value: CURRENT_TERM },
      { type: ComponentType.FIXED, value: 'peer-review' },
    ],
  },
  {
    name: ResourceName.COURSE_STUDY_BUDDY,
    possibleActions: [Action.MODERATE],
    components: [
      { type: ComponentType.FIXED, value: 'course' },
      { name: 'courseId', type: ComponentType.VARIABLE },
      { type: ComponentType.FIXED, value: 'instance' },
      { name: 'instanceId', type: ComponentType.VARIABLE, value: CURRENT_TERM },
      { type: ComponentType.FIXED, value: 'study-buddy' },
    ],
  },
  {
    name: ResourceName.COURSE_HOMEWORK,
    possibleActions: [Action.MUTATE, Action.INSTRUCTOR_GRADING, Action.TAKE],
    components: [
      { type: ComponentType.FIXED, value: 'course' },
      { name: 'courseId', type: ComponentType.VARIABLE },
      { type: ComponentType.FIXED, value: 'instance' },
      { name: 'instanceId', type: ComponentType.VARIABLE, value: CURRENT_TERM },
      { type: ComponentType.FIXED, value: 'homework' },
    ],
  },
  {
    name: ResourceName.ALL_COMMENTS,
    possibleActions: [Action.MODERATE],
    components: [{ type: ComponentType.FIXED, value: 'comments' }],
  },
  {
    name: ResourceName.ALL_STUDY_BUDDY,
    possibleActions: [Action.MODERATE],
    components: [{ type: ComponentType.FIXED, value: 'study-buddy' }],
  },
  {
    name: ResourceName.GLOBAL_ACCESS,
    possibleActions: [Action.ACCESS_CONTROL],
    components: [{ type: ComponentType.WILDCARD2, value: '**' }],
  },
  {
    name: ResourceName.COURSE_ACCESS,
    possibleActions: [Action.ACCESS_CONTROL],
    components: [
      { type: ComponentType.FIXED, value: 'course' },
      { name: 'courseId', type: ComponentType.VARIABLE },
      { type: ComponentType.FIXED, value: 'instance' },
      { name: 'instanceId', type: ComponentType.VARIABLE, value: CURRENT_TERM },
      { type: ComponentType.WILDCARD2, value: '**' },
    ],
  },
  {
    name: ResourceName.JOB_PORTAL,
    possibleActions: [Action.APPLY, Action.CREATE_JOB_TYPE],
    components: [
      { type: ComponentType.FIXED, value: 'instance' },
      { name: 'instanceId', type: ComponentType.VARIABLE, value: CURRENT_TERM },
      { type: ComponentType.FIXED, value: 'job-portal' },
    ],
  },
  {
    name: ResourceName.JOB_PORTAL_ORG,
    possibleActions: [Action.MUTATE, Action.CREATE_JOB_POST, Action.ACCESS_CONTROL],
    components: [
      { type: ComponentType.FIXED, value: 'orgId' },
      { name: 'orgId', type: ComponentType.VARIABLE },
    ],
  },
];

export const RESOURCE_TYPE_MAP = new Map<ResourceName, ResourceType>(
  ALL_RESOURCE_TYPES.map((resourceType) => [resourceType.name, resourceType])
);
export function getResourceId(resourceName: ResourceName, variables: Record<string, string>) {
  const resourceType = RESOURCE_TYPE_MAP.get(resourceName);
  if (!resourceType) {
    throw new Error(`Resource type ${resourceName} not found`);
  }
  const components = resourceType.components.map((component) => {
    if (component.type == ComponentType.VARIABLE) {
      const value = variables[component.name!];
      if (!value) {
        throw new Error(`Variable ${component.name} is required but not provided`);
      }
      return value;
    } else if (component.type == ComponentType.WILDCARD1) {
      return '*';
    } else if (component.type == ComponentType.WILDCARD2) {
      return '**';
    } else {
      return component.value;
    }
  });
  return '/' + components.join('/');
}

export function isValidAction(actionId: Action, resourceName: ResourceName) {
  const resourceType = RESOURCE_TYPE_MAP.get(resourceName);
  if (!resourceType) {
    throw new Error(`Resource type ${resourceName} not found`);
  }
  return resourceType.possibleActions.includes(actionId);
}
