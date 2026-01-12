import { Comment, CommentType, DEFAULT_POINTS, GrantReason, NotificationType } from '@alea/spec';
import { getCurrentTermForCourseId } from './get-current-term';
import axios from 'axios';
import { canUserModerateComments } from './access-control/resource-utils';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getExistingCommentDontEnd,
  getUserIdOrSetError,
  sendNotification,
} from './comment-utils';

function linkToComment({ threadId, courseId, courseTerm, institutionId, pageUrl }: any) {
  const instanceId = courseTerm || 'latest';
  const resolvedInstitutionId = institutionId || 'FAU';
  
  if (threadId && courseId) {
    return `/${resolvedInstitutionId}/${courseId}/${instanceId}/forum/${threadId}`;
  }
  if (courseId) return `/${resolvedInstitutionId}/${courseId}/${instanceId}/forum`;
  return pageUrl || '/';
}

async function sendCommentAlert(
  userId: string,
  isPrivate: boolean,
  isQuestion: boolean,
  link: string,
  courseId,
  courseTerm
) {
  if (isPrivate) return;
  const fullLink = `https://${process.env.NEXT_PUBLIC_NON_FAU_DOMAIN}${link}`;
  const message = (await canUserModerateComments(userId, courseId, courseTerm))
    ? `A moderator posted at ${fullLink}`
    : `A ${isQuestion ? 'question' : 'comment'} was posted at ${fullLink}`;
  await sendAlert(message);
}

export async function sendAlert(message: string) {
  const roomId = process.env.VOLL_KI_ALERTS_CHANNEL_ID;
  const token = process.env.VOLL_KI_ALERTS_BOT_TOKEN;
  if (!roomId || !token) return;

  return await axios.post(
    `https://matrix-client.matrix.org/_matrix/client/r0/rooms/${roomId}/send/m.room.message`,
    {
      msgtype: 'm.text',
      body: message,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

async function sendCommentNotifications(parentComment?: Comment, userId?: string) {
  if (!parentComment) return;
  const parentUserId = parentComment.userId;
  if (parentUserId && parentUserId !== userId) {
    await sendNotification(
      parentUserId,
      'Someone replied to your comment',
      '',
      'Jemand hat auf Ihren Kommentar geantwortet',
      '',
      NotificationType.COMMENT,
      linkToComment(parentComment)
    );
  }
}

export default async function handler(req, res) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const {
    archive,
    filepath,
    statement,
    parentCommentId,
    courseId,
    courseTerm,
    institutionId,
    selectedText,
    userEmail,
    userName,
    isPrivate,
    commentType,
    questionStatus,
    isAnonymous,
    uri,
    pageUrl,
  } = req.body as Comment;

  if (!statement || isPrivate === undefined || isAnonymous === undefined) {
    res.status(400).json({ message: 'Some fields missing!' });
    return;
  }
  if (isPrivate && isAnonymous) {
    res.status(400).json({ message: 'Anonymous comments can not be private!' });
    return;
  }
  const currentTerm = await getCurrentTermForCourseId(courseId);
  let threadId: number | undefined = undefined;
  let parentComment: Comment = undefined;
  if (parentCommentId) {
    const { existing, error } = await getExistingCommentDontEnd(parentCommentId);
    parentComment = existing;
    if (!parentComment) {
      res.status(error || 404).json({ message: 'Parent comment not found' });
      return;
    }
    threadId = parentComment.threadId;
  }
  const results = await executeAndEndSet500OnError(
    `INSERT INTO comments
      (archive, filepath, statement, parentCommentId, threadId, courseId, courseTerm, institutionId, selectedText, isPrivate, commentType, questionStatus, isAnonymous, userId, userName, userEmail, isDeleted, isEdited ,uri, pageUrl)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? , ?, ?)`,
    [
      archive,
      filepath,
      statement,
      parentCommentId,
      threadId,
      courseId,
      courseTerm,
      institutionId,
      selectedText,
      isPrivate ? 1 : 0,
      commentType,
      questionStatus,
      isAnonymous ? 1 : 0,
      isAnonymous ? null : userId,
      isAnonymous ? null : userName,
      isAnonymous ? null : userEmail,
      0,
      0,
      uri,
      pageUrl,
    ],
    res
  );
  if (!results) return;
  const newCommentId = results['insertId'];

  if (commentType === CommentType.QUESTION) {
    const reason = GrantReason.ASKED_QUESTION;
    await executeAndEndSet500OnError(
      'INSERT INTO points (points, reason, userId, commentId, granterId) VALUES (?, ?, ?, ?, ?)',
      [DEFAULT_POINTS.get(reason), reason, userId, newCommentId, 'auto'],
      res
    );
  }

  if (!parentCommentId) {
    await executeAndEndSet500OnError(
      `UPDATE comments SET threadId=? WHERE commentId=?`,
      [newCommentId, newCommentId],
      res
    );
  }
  res.status(200).json({ newCommentId });
  await sendCommentAlert(
    userId,
    isPrivate,
    commentType === CommentType.QUESTION,
    linkToComment({ threadId, courseId, courseTerm: currentTerm, institutionId, pageUrl }),
    courseId,
    courseTerm
  );
  await sendCommentNotifications(parentComment, userId);
}
