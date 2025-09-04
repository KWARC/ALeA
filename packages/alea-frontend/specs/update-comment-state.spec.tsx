import { Comment, HiddenStatus } from '@stex-react/spec';
import axios from 'axios';
import { createMocks } from 'node-mocks-http';
import { executeQuery } from '../pages/api/comment-utils';
import { processResults } from '../pages/api/get-comments';
import updateCommentState from '../pages/api/update-comment-state';
import { mockCommentData } from './add-comment.spec';
import { addCommentFromUser } from './delete-comments.spec';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('/api/update-comment-state', () => {
  test('Invalid comment update is rejected', async () => {
    const requestBody = {
      commentId: 3892498274928,
      hiddenStatus: HiddenStatus.SPAM,
      hiddenJustification: 'spammy',
    };

    const { req, res } = createMocks({
      method: 'POST',
      headers: { Authorization: 'JWT token' },
      body: requestBody,
    });
    mockedAxios.get.mockResolvedValueOnce({ data: { user_id: 'ym23eqaw' } });
    await updateCommentState(req, res);
    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Comment not found',
    });
  });

  test('Non moderators cannot change state', async () => {
    const commentId = await addCommentFromUser('user1');
    const requestBody = {
      commentId,
      hiddenStatus: HiddenStatus.SPAM,
      hiddenJustification: 'spammy',
    };

    const { req, res } = createMocks({
      method: 'POST',
      headers: { Authorization: 'JWT token' },
      body: requestBody,
    });
    mockedAxios.get.mockResolvedValueOnce({ data: { user_id: 'user1' } });
    await updateCommentState(req, res);
    expect(res._getStatusCode()).toBe(403);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Not a moderator',
    });
  });
  test('Private comments cannot be moderated', async () => {
    const commentId = await addCommentFromUser('user1', mockCommentData({ isPrivate: true }));
    const requestBody = {
      commentId,
      hiddenStatus: HiddenStatus.SPAM,
      hiddenJustification: 'spammy',
    };

    const { req, res } = createMocks({
      method: 'POST',
      headers: { Authorization: 'JWT token' },
      body: requestBody,
    });
    mockedAxios.get.mockResolvedValueOnce({ data: { user_id: 'ym23eqaw' } });
    await updateCommentState(req, res);
    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Comment not found',
    });
  });

  test('Moderator can mark public comments as SPAM', async () => {
    const commentId = await addCommentFromUser('user1');
    const requestBody = {
      commentId,
      hiddenStatus: HiddenStatus.SPAM,
      hiddenJustification: 'spammy',
    };

    const { req, res } = createMocks({
      method: 'POST',
      headers: { Authorization: 'JWT token' },
      body: requestBody,
    });
    mockedAxios.get.mockResolvedValueOnce({ data: { user_id: 'ym23eqaw' } });
    await updateCommentState(req, res);
    expect(res._getStatusCode()).toBe(204);

    const comments = await executeQuery('SELECT * FROM comments WHERE commentId=?', [commentId]);
    expect(await processResults(undefined, comments as Comment[])).toBe(true);
    expect(comments).toEqual([
      expect.objectContaining({
        hiddenStatus: 'SPAM',
        hiddenJustification: 'spammy',
        isEdited: false,
        isDeleted: false,
      }),
    ]);

    const history = await executeQuery('SELECT * FROM updateHistory WHERE commentId=?', [
      commentId,
    ]);

    expect(history).toEqual([
      expect.objectContaining({
        commentId,
        ownerId: 'user1',
        updaterId: 'ym23eqaw',
        previousHiddenStatus: null,
        previousHiddenJustification: null,
        updatedTimestamp: expect.anything(),
      }),
    ]);
  });
});
