import { Comment } from '@alea/spec';
import { FTML } from '@flexiformal/ftml';

export function organizeHierarchically(flatComments: Comment[]) {
  // console.log('organizeHierarchically triggered');
  const commentMap = new Map<number, Comment>();
  for (const comment of flatComments) {
    commentMap.set(
      comment.commentId,
      // Make sure we don't muck up flat comments.
      structuredClone(comment)
    );
  }
  const directChildMap = new Map<number, number[]>();
  directChildMap.set(0, []);
  commentMap.forEach((comment, commentId) => {
    const parentId = comment.parentCommentId || 0;
    if (!directChildMap.has(parentId)) {
      directChildMap.set(parentId, []);
    }
    directChildMap.get(parentId)?.push(commentId);
  });

  const topLevel = [] as Comment[];
  commentMap.forEach((comment) => {
    if (directChildMap.get(0)?.indexOf(comment.commentId) !== -1) topLevel.push(comment);
  });
  topLevel.sort(
    (c1: Comment, c2: Comment) => (c2.postedTimestampSec || 0) - (c1.postedTimestampSec || 0)
  );
  topLevel.forEach((comment) => generateCommentHierarchy(comment, directChildMap, commentMap));
  return topLevel;
}

function generateCommentHierarchy(
  flatComment: Comment,
  childMap: Map<number, number[]>,
  commentMap: Map<number, Comment>
) {
  const commentId = flatComment.commentId;
  const childIds = childMap.get(commentId) || [];
  for (const childCommentId of childIds) {
    const childComment = commentMap.get(childCommentId);
    if (!childComment) {
      console.log('Should not happen!');
      continue;
    }
    if (!flatComment.childComments) flatComment.childComments = [];
    flatComment.childComments.push(childComment);
    generateCommentHierarchy(childComment, childMap, commentMap);
  }
  // Reverse order at the top level.
  flatComment.childComments?.sort(
    (c1: Comment, c2: Comment) => (c1.postedTimestampSec || 0) - (c2.postedTimestampSec || 0)
  );
}

export function getTotalComments(comments?: Comment[]): number {
  if (!comments) return 0;
  return comments
    .map((c) => getTotalComments(c.childComments) + (c.isDeleted ? 0 : 1))
    .reduce((p, c) => p + c, 0);
}

const DRAFT_KEY_PREFIX = 'DRAFT';

function getDraftKey(uri: FTML.Uri, commentId: number) {
  const parts = [DRAFT_KEY_PREFIX, uri];
  if (commentId) parts.push(commentId.toString());
  return parts.join(':');
}

export function retrieveDraft(uri: FTML.Uri, commentId: number) {
  const key = getDraftKey(uri, commentId);
  return localStorage.getItem(key);
}

export function saveDraft(uri: FTML.Uri, commentId: number, draft: string) {
  const key = getDraftKey(uri, commentId);
  localStorage.setItem(key, draft);
}

export function discardDraft(uri: FTML.Uri, commentId: number) {
  const key = getDraftKey(uri, commentId);
  localStorage.removeItem(key);
}
