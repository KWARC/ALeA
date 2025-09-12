import { Phase, QuizWithStatus } from '@stex-react/spec';
import axios from 'axios';
import { createMocks } from 'node-mocks-http';
import createQuiz from '../pages/api/quiz/create-quiz';
import { CURRENT_TERM } from '@stex-react/utils';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

export function mockQuizData({
  quizStartTs = 169650073000,
  quizEndTs = 1696501334000,
  feedbackReleaseTs = 1696501934000,
  manuallySetPhase = Phase.UNSET,
  title = 'Sample Quiz',
  problems = {},
  courseId = 'ai-1',
  courseTerm = CURRENT_TERM,
}): QuizWithStatus {
  return {
    id: '',
    version: -1,

    courseId,
    courseTerm,
    quizStartTs,
    quizEndTs,
    feedbackReleaseTs,
    manuallySetPhase,

    title,
    problems,

    updatedAt: 0,
    updatedBy: '',
  };
}
//jest.mock('uuid', () => ({ v4: () => '123456789' }));

describe('/api/create-quiz', () => {
  test('GET request returns 405', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: { Authorization: 'JWT token' },
      body: mockQuizData({}),
    });
    await createQuiz(req as any, res as any);
    expect(res._getStatusCode()).toBe(405);
  });

  test('Non moderators cannot create quiz', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: { Authorization: 'JWT token' },
      body: mockQuizData({}),
    });
    mockedAxios.get.mockResolvedValueOnce({ data: { user_id: 'user1' } });
    await createQuiz(req as any, res as any);
    expect(res._getStatusCode()).toBe(403);
    expect(res._getData()).toEqual({
      message: 'Unauthorized.',
    });
  });

  test('Moderator can create quiz', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: { Authorization: 'JWT token' },
      body: mockQuizData({}),
    });
    mockedAxios.get.mockResolvedValueOnce({ data: { user_id: 'ym23eqaw' } });
    await createQuiz(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())['quizId']).toBeTruthy();
  });
});
