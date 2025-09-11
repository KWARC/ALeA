import { NextApiRequest, NextApiResponse } from 'next';
import { queryGradingDbAndEndSet500OnError } from './grading-db-utils';
import { getUserIdOrSetError } from './comment-utils';
import {
  DiligenceAndPerformanceData,
  UserAnonData,
  canAccessResource,
} from '@stex-react/spec';
import { queryMatomoDbAndEndSet500OnError } from './matomo-db-utils';
import { getAllQuizzes } from '@stex-react/node-utils';
import { Action, ResourceName } from '@stex-react/utils';
import { getUserIdIfAuthorizedOrSetError } from './access-control/resource-utils';

// SELECT user_id as userId, SUM(visit_total_time) visit_time  FROM matomo.matomo_log_visit  WHERE user_id IS NOT NULL AND visit_first_action_time >= '2023-10-01 10:00:00' AND visit_last_action_time <= '2023-10-30 10:00:00'   GROUP BY user_id

const QUIZ_DATA = [
  {
    quizId: 'quiz-bc71f711',
    prepStartTime: '2023-10-01 06:15:00',
    prepEndTime: '2023-10-18 15:05:00',
  },
  {
    quizId: 'quiz-d1a3f406',
    prepStartTime: '2023-10-18 06:15:00',
    prepEndTime: '2023-10-24 15:05:00',
  },
  {
    quizId: 'quiz-079df087',
    prepStartTime: '2023-10-24 15:25:00',
    prepEndTime: '2023-10-31 15:15:00',
  },
  {
    quizId: 'quiz-6d09501f',
    prepStartTime: '2023-10-31 16:25:00',
    prepEndTime: '2023-11-07 15:15:00',
  },
  {
    quizId: 'quiz-07067709',
    prepStartTime: '2023-11-07 15:25:00',
    prepEndTime: '2023-11-14 15:15:00',
  },
  {
    quizId: 'quiz-f6c68dff',
    prepStartTime: '2023-11-14 15:25:00',
    prepEndTime: '2023-11-21 15:15:00',
  },
  {
    quizId: 'quiz-a63a0ead',
    prepStartTime: '2023-11-21 15:25:00',
    prepEndTime: '2023-11-28 15:15:00',
  },
  {
    quizId: 'quiz-f7a23040',
    prepStartTime: '2023-11-28 15:25:00',
    prepEndTime: '2023-12-05 15:15:00',
  },
  {
    quizId: 'quiz-22fa2c95',
    prepStartTime: '2023-12-05 15:25:00',
    prepEndTime: '2023-12-12 15:15:00',
  },
  {
    quizId: 'quiz-195da34a',
    prepStartTime: '2023-12-12 15:25:00',
    prepEndTime: '2023-12-19 15:15:00',
  }
];
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const userId = await getUserIdIfAuthorizedOrSetError(req, res, ResourceName.EXPERIMENTAL, Action.MUTATE);
  if (!userId) return;
  
  const scoreInfo: any[] = await queryGradingDbAndEndSet500OnError(
    `SELECT userId, quizId, SUM(points) as quizScore
    FROM grading
    WHERE (quizId, problemId, userId, browserTimestamp_ms) IN (
      SELECT quizId, problemId, userId, MAX(browserTimestamp_ms) AS browserTimestamp_ms
      FROM grading
      GROUP BY quizId, problemId, userId
    )
    GROUP BY userId, quizId`,
    [],
    res
  );
  if (!scoreInfo) return;

  const userData: { [userId: string]: DiligenceAndPerformanceData } = {};
  for (const row of scoreInfo) {
    const { userId, quizId, quizScore } = row;
    if (!userData[userId]) userData[userId] = { quizInfo: {} };
    userData[userId].quizInfo[quizId] = { quizScore };
  }

  for (const quiz of QUIZ_DATA) {
    const { quizId, prepStartTime, prepEndTime } = quiz;
    const visitInfo: any[] = await queryMatomoDbAndEndSet500OnError(
      `SELECT user_id AS userId, SUM(visit_total_time) AS visitTime_sec 
      FROM matomo.matomo_log_visit 
      WHERE 
        user_id IS NOT NULL AND
        visit_first_action_time >= ? AND 
        visit_last_action_time <= ?  
      GROUP BY user_id`,
      [prepStartTime, prepEndTime],
      res
    );
    if (!visitInfo) return;
    for (const row of visitInfo) {
      const { userId, visitTime_sec } = row;
      if (!userData[userId]) userData[userId] = { quizInfo: {} };
      if (!userData[userId].quizInfo[quizId]) {
        userData[userId].quizInfo[quizId] = { quizScore: undefined };
      }
      userData[userId].quizInfo[quizId].visitTime_sec = visitTime_sec;
    }
  }
  const userIds = Object.keys(userData).sort(() => 0.5 - Math.random());
  for (const [idx, userId] of userIds.entries()) {
    if (!userId.startsWith('fake')) {
      userData[idx] = userData[userId];
    }
    delete userData[userId];
  }
  res.status(200).json({
    userData,
    quizzes: getAllQuizzes(),
  } as UserAnonData);
}
