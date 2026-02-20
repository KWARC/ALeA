export enum HiddenStatus {
  UNHIDDEN = 'UNHIDDEN',
  SPAM = 'SPAM',
  INCORRECT = 'INCORRECT',
  IRRELEVANT = 'IRRELEVANT',
  ABUSE = 'ABUSE',
  OTHER = 'OTHER',
}

export enum CommentType {
  QUESTION = 'QUESTION',
  REMARK = 'REMARK',
  OTHER = 'OTHER',
}

export enum QuestionStatus {
  UNANSWERED = 'UNANSWERED',
  ANSWERED = 'ANSWERED',
  ACCEPTED = 'ACCEPTED',
  OTHER = 'OTHER',
}

export interface Comment {
  commentId: number;
  archive?: string;
  filepath?: string;
  parentCommentId?: number;
  threadId?: number;
  courseId?: string;
  courseTerm?: string;
  institutionId?: string;
  selectedText?: string;

  statement?: string;

  isEdited?: boolean;
  isPrivate: boolean;
  isDeleted?: boolean;

  hiddenStatus?: HiddenStatus;
  hiddenJustification?: string;

  commentType?: CommentType;
  questionStatus?: QuestionStatus;

  isAnonymous: boolean;
  userId?: string;
  userName?: string;
  userEmail?: string;

  totalPoints?: number;
  pointsGranted?: number;

  postedTimestampSec?: number;
  updatedTimestampSec?: number;

  childComments?: Comment[];
  uri?: string;
  pageUrl?: string;
  // TODO: Someway to specify location in the doc.
}

export function isHiddenNotSpam(status?: HiddenStatus) {
  return !!status && ![HiddenStatus.UNHIDDEN, HiddenStatus.SPAM].includes(status);
}
export function isSpam(status?: HiddenStatus) {
  return status === HiddenStatus.SPAM;
}

export interface GetCommentsRequest {
  uris: string[];
}

export interface EditCommentRequest {
  commentId: number;
  statement: string;
}

export interface UpdateCommentStateRequest {
  commentId: number;
  hiddenStatus: HiddenStatus;
  hiddenJustification: string;
}

export interface UpdateQuestionStateRequest {
  commentId: number;
  questionStatus?: QuestionStatus;
  commentType: CommentType;
}

export interface ReopenQuestionRequest {
  commentId: number;
}

export interface UserInformation {
  userId: string;
  showTrafficLight: boolean;
  showSectionReview: boolean;
  notificationSeenTs: number;
  isVerified: boolean;
}

export interface UserSignUpDetail {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  verificationToken: string;
}

export enum AuthProvider {
  EMAIL_PASSWORD = 'EMAIL_PASSWORD',
  FAU_IDM = 'FAU_IDM',
}

export interface BlogPost {
  title: string;
  body: string;
  authorId: string;
  postId: string;
  heroImageId: string;
  heroImageUrl: string;
  heroImagePosition: string;

  createdAt: string;
  updatedAt: string;
  authorName: string;
}

export interface PostSnippet {
  postId: string;
  title: string;
  authorName: string;
  createdAt: string;
  heroImageUrl: string;
  heroImagePosition: string;
}

export interface CdnImage {
  id: string;
  metadata: CdnImageMetadata;
}

export interface CdnImageMetadata {
  id: string;
  title: string;
  url_viewer: string;
  url: string;
  display_url: string;
  width: string;
  height: string;
  size: string;
  time: string;
  expiration: string;
  image: Image;
  thumb: Image;
  medium: Image;
  delete_url: string;
}

export interface Image {
  filename: string;
  name: string;
  mime: string;
  extension: string;
  url: string;
}

export const ANON_USER_ID_PREFIX = '_anon_';

export interface TempUserSignupRequest {
  userId: string;
  firstName: string;
  lastName: string;
  password: string;
}
