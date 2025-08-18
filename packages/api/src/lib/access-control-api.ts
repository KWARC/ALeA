import { Action, ResourceActionPair, ResourceName } from '@stex-react/utils';
import axios from 'axios';
import { AccessControlList, ResourceAction } from './access-control';
import { getAuthHeaders } from './lmp';

export async function hasAclAssociatedResources(aclId: string): Promise<boolean> {
  const response = await axios.get<{ hasResources: boolean }>(
    `/api/access-control/has-acl-associated-resources?aclId=${aclId}`,
    { headers: getAuthHeaders() }
  );
  return response.data.hasResources;
}

export async function getAllAclIds(): Promise<string[]> {
  const resp = await axios.get('/api/access-control/get-all-acl-ids');
  return resp.data as string[];
}

export async function getSpecificAclIds(resourceActionPairs: ResourceActionPair[]) {
  const resp = await axios.post('/api/access-control/get-specific-aclids', { resourceActionPairs });
  return resp.data as string[];
}

export async function createAcl(newAcl: CreateACLRequest): Promise<void> {
  await axios.post('/api/access-control/create-acl', newAcl);
}

export async function deleteAcl(aclId: string): Promise<void> {
  await axios.post('/api/access-control/delete-acl', { id: aclId }, { headers: getAuthHeaders() });
}

export async function getAcl(aclId: string): Promise<AccessControlList> {
  const resp = await axios.get(`/api/access-control/get-acl?id=${aclId}`);
  return resp.data as AccessControlList;
}

export async function getAclUserDetails(aclId: string) {
  const resp = await axios.get(`/api/access-control/get-acl-userdetails?id=${aclId}`);
  return resp.data as { fullName: string; userId: string }[];
}

export async function getCourseAcls(courseId: string, instanceId: string) {
  const resp = await axios.get(
    `/api/access-control/get-course-acls?courseId=${courseId}&instanceId=${instanceId}`
  );
  return resp.data as string[];
}

export async function getAllAclMembers(
  aclId: string
): Promise<{ fullName: string; userId: string }[]> {
  const resp = await axios.get(`/api/access-control/get-all-members?id=${aclId}`);
  return resp.data;
}

export async function updateAcl(updateAcl: UpdateACLRequest): Promise<void> {
  await axios.post('/api/access-control/update-acl', updateAcl, { headers: getAuthHeaders() });
}

export async function isUserMember(id: string): Promise<boolean> {
  const { data } = await axios.get(`/api/access-control/is-user-member?id=${id}`, {
    headers: getAuthHeaders(),
  });
  return data as boolean;
}

export async function isMember(id: string, userId: string): Promise<boolean> {
  const { data } = await axios.get(`/api/access-control/is-member?id=${id}&userId=${userId}`, {
    headers: getAuthHeaders(),
  });
  return data as boolean;
}

export async function isValid(id: string): Promise<boolean> {
  const { data } = await axios.get(`/api/access-control/is-valid?id=${id}`, {
    headers: getAuthHeaders(),
  });
  return data as boolean;
}

export async function recomputeMemberships(): Promise<void> {
  await axios.post(
    '/api/access-control/recompute-memberships',
    {},
    {
      headers: getAuthHeaders(),
    }
  );
}

export async function createResourceAction(resourceData: CreateResourceAction): Promise<void> {
  await axios.post('/api/access-control/create-resourceaction', resourceData, {
    headers: getAuthHeaders(),
  });
}
export async function updateResourceAction(resourceData: UpdateResourceAction): Promise<void> {
  await axios.post('/api/access-control/update-resourceaccess-pair', resourceData, {
    headers: getAuthHeaders(),
  });
}
export async function deleteResourceAction(resourceId: string, actionId: string): Promise<void> {
  await axios.post(
    '/api/access-control/delete-resourceaction',
    { resourceId, actionId },
    { headers: getAuthHeaders() }
  );
}

export async function getAllResourceActions(): Promise<ResourceAction[]> {
  const { data } = await axios.get('/api/access-control/get-all-resourceacces-pairs', {
    headers: getAuthHeaders(),
  });
  return data as ResourceAction[];
}

export async function canAccessResource(
  resourceName: ResourceName,
  actionId: Action,
  variables: Record<string, string> = {}
): Promise<boolean> {
  const queryParams = new URLSearchParams({ resourceName, actionId });
  for (const [key, value] of Object.entries(variables)) {
    queryParams.append(key, value);
  }
  const url = `/api/access-control/can-access-resource?${queryParams.toString()}`;
  try {
    const { data } = await axios.get(url, { headers: getAuthHeaders() });
    return data as boolean;
  } catch (e: any) {
    if (e?.response?.status !== 403 && e?.response?.status !== 401) {
      console.error(e);
    }
    return false;
  }
}

export async function canModerateComment(courseId?: string, courseTerm?: string) {
  const { data } = await axios.get('/api/access-control/can-moderate-comment', {
    headers: getAuthHeaders(),
    params: { courseId, courseTerm },
  });
  return data as boolean;
}

export async function canModerateStudyBuddy(courseId?: string, courseTerm?: string) {
  const { data } = await axios.get('/api/access-control/can-moderate-study-buddy', {
    headers: getAuthHeaders(),
    params: { courseId, courseTerm },
  });
  return data as boolean;
}

export async function addRemoveMember({
  memberId,
  aclId,
  isAclMember,
  toBeAdded,
}: {
  memberId: string;
  aclId: string;
  isAclMember: boolean;
  toBeAdded: boolean;
}): Promise<void> {
  await axios.post(
    '/api/access-control/add-remove-member',
    { memberId, aclId, isAclMember, toBeAdded },
    { headers: getAuthHeaders() }
  );
}

// Anshuman//
export async function createInstructorCourseMemberAcl(courseId: string): Promise<{ aclId: string }> {
  const response = await axios.post(
    '/api/access-control/instructor-dashboard/create-member-acl',
    { courseId },
    { headers: getAuthHeaders() }
  );
  return response.data.data; // this contains `{ aclId }`
}


export type UpdateACLRequest = Omit<AccessControlList, 'updatedAt' | 'createdAt'>;
export type CreateACLRequest = Omit<AccessControlList, 'createdAt' | 'updatedAt'>;
export type CreateResourceAction = Omit<ResourceAction, 'createdAt' | 'updatedAt'>;
export type UpdateResourceAction = Omit<ResourceAction, 'createdAt' | 'updatedAt'>;
