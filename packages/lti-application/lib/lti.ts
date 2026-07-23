export type LaunchUser = {
  name: string;
  email: string;
  id: string;
  role: string;
};

const rolesClaim = 'https://purl.imsglobal.org/spec/lti/claim/roles';

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

export function getRoleType(roles: string[]) {
  const normalizedRoles = roles.map((role) => role.toLowerCase());

  if (
    normalizedRoles.some(
      (role) =>
        role.includes('instructor') ||
        role.includes('teacher') ||
        role.includes('faculty')
    )
  ) {
    return 'instructor';
  }

  if (
    normalizedRoles.some(
      (role) => role.includes('learner') || role.includes('student')
    )
  ) {
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
