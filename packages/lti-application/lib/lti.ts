export type LaunchUser = {
  name: string;
  email: string;
  id: string;
  role: string;
};

const rolesClaim = 'https://purl.imsglobal.org/spec/lti/claim/roles';
const contextClaim = 'https://purl.imsglobal.org/spec/lti/claim/context';
const deploymentIdClaim = 'https://purl.imsglobal.org/spec/lti/claim/deployment_id';
const messageTypeClaim = 'https://purl.imsglobal.org/spec/lti/claim/message_type';
const resourceLinkClaim = 'https://purl.imsglobal.org/spec/lti/claim/resource_link';
const targetLinkUriClaim = 'https://purl.imsglobal.org/spec/lti/claim/target_link_uri';
const versionClaim = 'https://purl.imsglobal.org/spec/lti/claim/version';

export type LaunchContext = {
  id: string;
  label: string;
  title: string;
};

export type LaunchResourceLink = {
  id: string;
  title: string;
};

export type LaunchDetails = {
  platformIssuer: string;
  deploymentId: string;
  messageType: string;
  version: string;
  roleType: string;
  targetLinkUri: string;
  user: LaunchUser;
  context?: LaunchContext;
  resourceLink?: LaunchResourceLink;
  courseId: string;
  institutionId: string;
  instanceId: string;
};

export function getLaunchUser(payload: Record<string, unknown>): LaunchUser {
  return {
    name: String(payload.name ?? payload.given_name ?? 'Not provided'),
    email: String(payload.email ?? 'Not provided'),
    id: String(payload.sub ?? 'Not provided'),
    role: 'unknown',
  };
}

export function getLaunchRoles(payload: Record<string, unknown>) {
  const roles = payload[rolesClaim];
  return Array.isArray(roles) ? roles.map(String) : [];
}

export function getLaunchDetails(payload: Record<string, unknown>): LaunchDetails {
  const user = getLaunchUser(payload);
  const roleType = getRoleType(getLaunchRoles(payload));
  const context = getLaunchContext(payload);
  const resourceLink = getLaunchResourceLink(payload);
  const platformIssuer = String(payload.iss ?? '');
  const deploymentId = String(payload[deploymentIdClaim] ?? '');
  const messageType = String(payload[messageTypeClaim] ?? '');
  const version = String(payload[versionClaim] ?? '');
  const targetLinkUri = String(payload[targetLinkUriClaim] ?? '');
  const courseId = resourceLink?.id || context?.label || context?.id || 'lti-course';
  const instanceId = deploymentId || context?.id || 'lti-instance';

  return {
    platformIssuer,
    deploymentId,
    messageType,
    version,
    roleType,
    targetLinkUri,
    user: {
      ...user,
      role: roleType,
    },
    context,
    resourceLink,
    courseId,
    institutionId: platformIssuer || 'lti',
    instanceId,
  };
}

export function getRoleType(roles: string[]) {
  const normalizedRoles = roles.map((role) => role.toLowerCase());

  if (
    normalizedRoles.some(
      (role) => role.includes('instructor') || role.includes('teacher') || role.includes('faculty')
    )
  ) {
    return 'instructor';
  }

  if (normalizedRoles.some((role) => role.includes('learner') || role.includes('student'))) {
    return 'student';
  }

  return 'unknown';
}

export function launchUserToQuery(user: LaunchUser, role: string) {
  return new URLSearchParams({
    name: user.name,
    email: user.email,
    id: user.id,
    role,
  }).toString();
}

export function launchUserFromQuery(
  query: Record<string, string | string[] | undefined>
): LaunchUser {
  return {
    name: getQueryValue(query.name),
    email: getQueryValue(query.email),
    id: getQueryValue(query.id),
    role: getQueryValue(query.role),
  };
}

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function getLaunchContext(payload: Record<string, unknown>) {
  const context = getObjectClaim(payload[contextClaim]);
  if (!context) return undefined;
  return {
    id: String(context.id ?? ''),
    label: String(context.label ?? ''),
    title: String(context.title ?? ''),
  };
}

function getLaunchResourceLink(payload: Record<string, unknown>) {
  const resourceLink = getObjectClaim(payload[resourceLinkClaim]);
  if (!resourceLink) return undefined;
  return {
    id: String(resourceLink.id ?? ''),
    title: String(resourceLink.title ?? ''),
  };
}

function getObjectClaim(value: unknown) {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}
