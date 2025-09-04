import { AbstractResourceAssignmentCache } from './resource-cache-store';
import { ResourceAction } from '@stex-react/spec';
import { getCacheKey } from './resource-common-utils';
import { RedisInstance } from '../redis-utils';

export class RedisCache extends AbstractResourceAssignmentCache {
  private db = RedisInstance;
  async initialize(resourceAccessData: ResourceAction[]) {
    this.storeResourceAccessData(resourceAccessData);
  }
  async storeResourceAccessData(resourceAccessData: ResourceAction[]) {
    this.db.keys('resource-assignment:*', (err, keys) => {
      if (err) {
        throw new Error(`Error fetching keys from redis: ${err.message}`);
      }
      if (keys.length === 0) return;
      this.db.del(...keys, (err, reply) => {
        if (err) {
          throw new Error(`Error fetching keys from redis: ${err.message}`);
        }
      });
    });

    for (const resource of resourceAccessData) {
      const key = getCacheKey(resource.resourceId, resource.actionId);
      await this.db.set(key, resource.aclId);
    }
  }
  async getAclId(resourceId: string, actionId: string): Promise<string | undefined> {
    const key = getCacheKey(resourceId, actionId);
    const aclId = await this.db.get(key);
    if (!aclId) return undefined;
    return aclId;
  }
}
