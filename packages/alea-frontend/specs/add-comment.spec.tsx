import axios from 'axios';
import addComment from '../pages/api/add-comment';
import { createMocks } from 'node-mocks-http';
import { executeQuery } from '../pages/api/comment-utils';
import { Comment } from '@stex-react/spec';
import { processResults } from '../pages/api/get-comments';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

export function mockCommentData({
  archive = 'archive',
  filepath = 'filepath',
  statement = 'statement',
  selectedText = 'selectedText',
  userEmail = 'some@email.com',
  userName = 'some name',
  commentType = null,
  courseId = null,
  courseTerm = null,
  parentCommentId = null,
  isPrivate = false,
  isAnonymous = false,
}): Comment {
  return {
    commentId: null,
    archive,
    filepath,
    statement,
    parentCommentId,
    selectedText,
    userEmail,
    userName,
    commentType,
    courseId,
    courseTerm,
    isPrivate,
    isAnonymous,
  };
}

export function expectedComment(commentId, userId, providedInput: Comment) {
  return {
    ...providedInput,
    commentId,
    userId,
    isDeleted: false,
    isEdited: false,
    hiddenJustification: null,
    hiddenStatus: null,
    selectedElement: null, // not yet implemented.
    // postedTimestamp: expect.anything(),
    // updatedTimestamp: expect.anything(),
  };
}

describe('/api/add-comment', () => {
  test('GET request returns 405', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: { Authorization: 'JWT token' },
      body: mockCommentData({ isPrivate: true, isAnonymous: false }),
    });
    await addComment(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  test('No auth causes 403', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: mockCommentData({ isPrivate: true, isAnonymous: false }),
    });
    await addComment(req, res);
    expect(res._getStatusCode()).toBe(403);
  });

  test('Bad auth causes 403', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: { Authorization: 'JWT token' },
      body: mockCommentData({ isPrivate: true, isAnonymous: false }),
    });
    mockedAxios.get.mockResolvedValueOnce({ data: undefined });
    await addComment(req, res);
    expect(res._getStatusCode()).toBe(403);
  });

  test('Missing data causes 400', async () => {
    //
    const { req, res } = createMocks({
      method: 'POST',
      headers: { Authorization: 'JWT token' },
      body: mockCommentData({
        statement: '',
        isPrivate: true,
        isAnonymous: false,
      }),
    });
    mockedAxios.get.mockResolvedValueOnce({ data: { user_id: 'user1' } });
    await addComment(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Some fields missing!',
    });
  });

  test('Anonymous comments cannot be private', async () => {
    const addCommentBody = mockCommentData({
      isPrivate: true,
      isAnonymous: true,
    });
    const { req, res } = createMocks({
      method: 'POST',
      headers: { Authorization: 'JWT token' },
      body: addCommentBody,
    });
    mockedAxios.get.mockResolvedValueOnce({ data: { user_id: 'user1' } });
    await addComment(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Anonymous comments can not be private!',
    });
  });

  test('Valid comment added', async () => {
    const addCommentBody = mockCommentData({
      isPrivate: true,
      isAnonymous: false,
    });
    const { req, res } = createMocks({
      method: 'POST',
      headers: { Authorization: 'JWT token' },
      body: addCommentBody,
    });
    mockedAxios.get.mockResolvedValueOnce({ data: { user_id: 'user1' } });
    await addComment(req, res);
    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());
    expect(response).toEqual(expect.objectContaining({ newCommentId: expect.any(Number) }));
    const commentId = response.newCommentId;

    const comments = await executeQuery('SELECT * FROM comments WHERE commentId=?', [commentId]);
    expect(comments).not.toHaveProperty('error');
    expect(await processResults(undefined, comments as Comment[])).toBe(true);
    const expected = expectedComment(commentId, 'user1', addCommentBody);
    expect(comments).toEqual([
      expect.objectContaining({
        ...expected,
        threadId: commentId,
        postedTimestampSec: expect.any(Number),
        updatedTimestampSec: expect.any(Number),
      }),
    ]);
  });
});
