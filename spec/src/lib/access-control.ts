export interface AccessControlList {
  id: string;
  description: string;
  isOpen: boolean;
  updaterACLId: string;
  memberUserIds: string[];
  memberACLIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ResourceAction {
  resourceId: string;
  actionId: string;
  aclId: string;
  createdAt: string;
  updatedAt: string;
}
