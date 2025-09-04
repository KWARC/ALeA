export enum GrantReason {
  HELPFUL_COMMENT = 'HELPFUL_COMMENT',
  ASKED_QUESTION = 'ASKED_QUESTION',
  RESPONDED_TO_QUESTION = 'RESPONDED_TO_QUESTION',
  ANSWERED_CORRECTLY = 'ANSWERED_CORRECTLY',
  REPORTED_ERROR = 'REPORTED_ERROR',
  OTHER = 'OTHER',
}

export interface GrantPointsRequest {
  reason: GrantReason;
  points: number;
  commentId?: number;
}

export const DEFAULT_POINTS = new Map<GrantReason, number>([
  [GrantReason.HELPFUL_COMMENT, 3],
  [GrantReason.ASKED_QUESTION, 1],
  [GrantReason.RESPONDED_TO_QUESTION, 1],
  [GrantReason.ANSWERED_CORRECTLY, 5],
  [GrantReason.REPORTED_ERROR, 2],
]);

export interface PointsGrant {
  points: number;
  reason: string;
  userId: string;
  commentId?: number;

  granterId?: string;
  grantTimestampSec?: number;
}

export function pointsToLevel(points: number) {
  if (!points) return 0;
  if (points < 5) return 1;
  if (points < 15) return 2;
  if (points < 30) return 3;
  if (points < 100) return 4;
  if (points < 300) return 5;
  return 6;
}
