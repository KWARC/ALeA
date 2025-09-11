import { ResourceAction } from '@stex-react/spec';
import { AbstractResourceAssignmentCache } from './resource-cache-store';
import { getCacheKey } from './resource-common-utils';

export class InmemoryCache extends AbstractResourceAssignmentCache {
  private cache: Map<string, string> = new Map();
  async initialize(resourceAccessData: ResourceAction[]) {
    this.storeResourceAccessData(resourceAccessData);
  }
  async storeResourceAccessData(resourceAccessData: ResourceAction[]) {
    this.cache.clear();
    for (const resource of resourceAccessData) {
      const key = getCacheKey(resource.resourceId, resource.actionId);
      this.cache.set(key, resource.aclId);
    }
  }
  async getAclId(resourceId: string, actionId: string): Promise<string> {
    const key = getCacheKey(resourceId, actionId);
    const aclId = this.cache.get(key);
    if (aclId) return aclId;
    throw new Error(`No aclId found for resource ${resourceId} and action ${actionId}`);
  }
}
