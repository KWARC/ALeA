import { CourseResourceAction, isLoggedInViaCookie } from '@alea/utils';
import axios, { AxiosError } from 'axios';
import {
  BlogPost,
  CdnImageMetadata,
  Comment,
  CommentType,
  EditCommentRequest,
  HiddenStatus,
  PostSnippet,
  QuestionStatus,
  TempUserSignupRequest,
  UpdateCommentStateRequest,
  UpdateQuestionStateRequest,
  UserInformation,
  UserSignUpDetail,
} from './comment';
import {  logoutAndGetToLoginPage } from './lmp';

async function commentRequest(apiUrl: string, requestType: string, data?: any) {
  try {
    const resp =
      requestType === 'POST'
        ? await axios.post(apiUrl, data)
        : await axios.get(apiUrl);
    return resp.data;
  } catch (err) {
    const error = err as Error | AxiosError;
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        logoutAndGetToLoginPage();
      }
    }
    throw err;
  }
}

export async function addComment(comment: Comment): Promise<number> {
  const respData = await commentRequest('/api/add-comment', 'POST', comment);
  return respData['newCommentId'];
}

export async function editComment(commentId: number, statement: string) {
  const body: EditCommentRequest = { commentId, statement };
  await commentRequest('/api/edit-comment', 'POST', body);
}

export async function deleteComment(commentId: number) {
  await commentRequest(`/api/delete-comment/${commentId}`, 'POST');
}

export async function getComments(uris: string[]): Promise<Comment[]> {
  const comments: Comment[] = await commentRequest(`/api/get-comments`, 'POST', { uris });
  return comments;
}

export async function getThreadsForCourseInstance(
  courseId: string,
  courseTerm: string
): Promise<Comment[]> {
  const comments: Comment[] = await commentRequest(
    `/api/get-comments-for-course-instance`,
    'POST',
    { courseId, courseTerm }
  );
  return comments;
}

export async function getCommentsForThread(threadId: number): Promise<Comment[]> {
  const comments: Comment[] = await commentRequest(
    `/api/get-comments-for-thread/${threadId}`,
    'GET'
  );
  return comments;
}

export async function updateCommentState(
  commentId: number,
  hiddenStatus: HiddenStatus,
  hiddenJustification: string
) {
  const body: UpdateCommentStateRequest = {
    commentId,
    hiddenStatus,
    hiddenJustification,
  };
  await commentRequest('/api/update-comment-state', 'POST', body);
}

export async function updateQuestionState(
  commentId: number,
  commentType: CommentType,
  questionStatus?: QuestionStatus
) {
  const body: UpdateQuestionStateRequest = {
    commentId,
    questionStatus,
    commentType,
  };
  await commentRequest('/api/update-question-state', 'POST', body);
}

export async function getCourseInstanceThreads(
  courseId: string,
  courseTerm: string,
  institutionId: string
): Promise<Comment[]> {
  const comments: Comment[] = await commentRequest(`/api/get-course-instance-threads`, 'POST', {
    courseId,
    courseTerm,
    institutionId,
  });
  return comments;
}

export async function getLatestUpdatedSections() {
  return await commentRequest('/api/get-latest-updated-sections', 'GET');
}

export async function getMyNotesSections() {
  return await commentRequest('/api/get-my-notes-sections', 'GET');
}

export async function purgeComments() {
  return await commentRequest('/api/purge-comments', 'POST');
}

export async function getAllMyComments() {
  return await commentRequest('/api/get-all-my-comments', 'GET');
}

let cachedUserInformation: UserInformation | undefined = undefined;

export async function getUserInformation() {
  if (!cachedUserInformation) {
    const url = '/api/get-user-information';
    const resp = await axios.get(url);
    cachedUserInformation = resp.data;
  }
  return cachedUserInformation;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  studyProgram: string;
  semester: string;
  languages: string; // comma separated list of languages
}

export async function getUserProfile() {
  try {
    const response = await axios.get('/api/get-user-profile');
    return response.data as UserProfile;
  } catch (err) {
    const error = err as AxiosError;
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      logoutAndGetToLoginPage();
    }
    throw new Error('Failed to fetch user profile');
  }
}

export async function updateUserProfile(
  userId: string,
  firstName: string,
  lastName: string,
  email: string,
  studyProgram: string,
  semester: string,
  languages: string
) {
  return await axios.post(
    '/api/update-user-profile',
    { userId, firstName, lastName, email, studyProgram, semester, languages }
  );
}

export async function updateTrafficLightStatus(trafficStatus: boolean) {
  cachedUserInformation = undefined;
  return await axios.post(
    '/api/update-trafficlight-status',
    { trafficStatus }
  );
}

export async function updateSectionReviewStatus(showSectionReview: boolean) {
  cachedUserInformation = undefined;
  return await axios.post(
    '/api/update-section-review-status',
    { showSectionReview }
  );
}

export async function signUpUser(userDetail: UserSignUpDetail) {
  return await axios.post('/api/signup', { userDetail });
}

export async function logInUser(userId: string, password: string) {
  const response = await axios.post('/api/login', { userId, password });
  return response.data;
}

export async function verifyEmail(email: string, verificationToken: string) {
  return await axios.post('/api/verify-email', { email, verificationToken });
}

export async function sendForgotEmail(email: string) {
  return await axios.post('/api/send-forgot-email', { email });
}

export async function resetPassword(
  email: string,
  newPassword: string,
  resetPasswordToken: string
) {
  return await axios.post('/api/reset-password', {
    email,
    newPassword,
    resetPasswordToken,
  });
}

export async function sendVerificationEmail(userId: string, verificationToken: string) {
  return await axios.post('/api/send-verification-email', {
    userId,
    verificationToken,
  });
}

export async function createBlogPost(
  title: string,
  body: string,
  postId: string,
  heroImageId?: string,
  heroImageUrl?: string,
  heroImagePosition?: string
) {
  return await axios.post(
    '/api/blog/create-post',
    {
      title,
      body,
      postId,
      heroImageId,
      heroImageUrl,
      heroImagePosition,
    }
  );
}

export async function getPostSnippets(): Promise<PostSnippet[]> {
  return (await axios.get('/api/blog/get-post-snippets')).data;
}

export async function getPostById(
  postId: string,
  forSSR = false,
  protocol?: string,
  host?: string
): Promise<BlogPost> {
  const apiUrl = forSSR
    ? `${protocol}://${host}/api/blog/get-post-by-id`
    : '/api/blog/get-post-by-id';

  return (await axios.get(apiUrl, { params: { postId } })).data;
}

export async function updateBlogPost(
  title: string,
  body: string,
  heroImageId: string,
  heroImageUrl: string,
  heroImagePosition: string,
  postId: string
) {
  return await axios.post(
    '/api/blog/update-post',
    { title, body, heroImageId, heroImageUrl, postId, heroImagePosition }
  );
}

export async function deleteBlogPost(postId: string) {
  return await axios.post('/api/blog/delete-post', { postId });
}

export async function uploadCdnImage(imageBase64: string): Promise<object> {
  return (
    await axios.post('/api/blog/upload-cdn-image', {
      image: imageBase64,
    })
  ).data;
}

export async function getCdnImages(): Promise<CdnImageMetadata[]> {
  const res = (await axios.get('/api/blog/get-cdn-images')).data;
  const values: CdnImageMetadata[] = res.map((val: any) => {
    return JSON.parse(val.metadata);
  });
  return values;
}

export async function anonUserSignUp(tempUserSignupRequest: TempUserSignupRequest) {
  return await axios.post('/api/anon-login/signup', tempUserSignupRequest);
}

export async function checkIfUserIdExists(userId: string) {
  const response = await axios.post('/api/userid-exists', { userId });
  return response.data as { exists: boolean };
}

export async function generateApfelToken(userId: string, time: number) {
  const response = await axios.post('/api/generate-apfel-token', { userId, time });
  return response.data;
}

export async function updateUserInfoFromToken() {
  const response = await axios.post(
    '/api/update-user-info-from-token',
    {}
  );
  return response.data;
}

export async function getResourcesForUser() {
  if (!isLoggedInViaCookie()) return [];
  const response = await axios.post(
    '/api/get-resources-for-user',
    {}
  );
  return response.data as CourseResourceAction[];
}

export async function getStudentsEnrolledInCourse(courseId: string, instanceId: string) {
  const response = await axios.get('/api/get-students-enrolled-in-course', {
    params: {
      courseId,
      instanceId,
    },
  });
  return response.data;
}

export async function getStudentCountInCourse(courseId: string, instanceId: string) {
  const response = await axios.get('/api/get-student-count-in-course', {
    params: {
      courseId,
      instanceId,
    },
  });
  return response.data;
}

export async function getCourseIdsForEnrolledUser(instanceId?: string) {
  const response = await axios.post(
    '/api/get-courseids-for-enrolled-user',
    {
      instanceId,
    }
  );
  return response.data;
}

export async function getAllCourses(universityId?: string) {
  const response = await axios.get('/api/get-all-courses', {
    params: {
      ...(universityId ? { universityId } : {}),
    },
  });
  return response.data;
}

export async function getCurrentTerm(courseId?: string): Promise<string | Record<string, string>> {
  const response = await axios.get<Record<string, string> | { courseId: string; currentTerm: string }>('/api/get-current-term', {
    params: courseId ? { courseId } : {},
  });
  if (courseId) {
    return (response.data as { courseId: string; currentTerm: string }).currentTerm;
  }
  return response.data as Record<string, string>;
}

