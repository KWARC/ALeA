export interface Notification {
  header: string;
  content: string;
  postedTimestamp: string;
  link: string;
  notificationType: NotificationType;
}

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  STUDY_BUDDY = 'STUDY_BUDDY',
  COMMENT = 'COMMENT',
  PEER_REVIEW = 'PEER_REVIEW',
  REPORT_PROBLEM = 'REPORT_PROBLEM',
  SUGGESTION = 'SUGGESTION',
}
