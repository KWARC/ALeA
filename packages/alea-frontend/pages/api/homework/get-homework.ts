import { FTML } from '@kwarc/ftml-viewer';
import {
  AnswerResponse,
  FTMLProblemWithSolution,
  getHomeworkPhase,
  GetHomeworkResponse,
  GradingInfo,
  HomeworkInfo,
  HomeworkPhase,
  ResponseWithSubProblemId,
} from '@stex-react/api';
import { Action, ResourceName } from '@stex-react/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { isUserIdAuthorizedForAny, ResourceActionParams } from '../access-control/resource-utils';
import {
  checkIfGetOrSetError,
  executeAndEndSet500OnError,
  executeDontEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import {
  convertToSubProblemIdToAnswerId,
  getAllGradingsOrSetError,
} from '../nap/get-answers-info';

function getPhaseAppropriateProblems(
  problems: { [problemId: string]: FTMLProblemWithSolution },
  isModerator: boolean,
  phase: HomeworkPhase
): { [problemId: string]: FTMLProblemWithSolution } {
  if (isModerator) return problems;
  switch (phase) {
    case 'FEEDBACK_RELEASED':
    case 'SUBMISSION_CLOSED':
      return problems;
    case 'GIVEN': {
      const problemsCopy = {};
      for (const problemId in problems) {
        problemsCopy[problemId] = { problem: problems[problemId].problem, solution: undefined };
      }
      return problemsCopy;
    }
    case 'NOT_GIVEN':
    default:
      return {};
  }
}

export async function getAllAnswersForHomeworkOrSetError(
  userId: string,
  homeworkId: number,
  questionId: string | undefined,
  res: NextApiResponse
) {
  const answerEntries = await executeAndEndSet500OnError<AnswerResponse[]>(
    `SELECT questionId, subProblemId, answer, id
      FROM Answer 
      WHERE (homeworkId, questionId, subProblemId, updatedAt) IN (
        SELECT homeworkId, questionId, subProblemId, MAX(updatedAt) AS updatedAt 
        FROM Answer 
        WHERE homeworkId=? AND userId=? ${questionId ? 'AND questionId=?' : ''}
        GROUP BY homeworkId, questionId, subProblemId
      )
      ORDER BY questionId, subProblemId`,
    [homeworkId, userId, ...(questionId ? [questionId] : [])],
    res
  );
  if (!answerEntries) return;
  const responses: Record<string, Record<string, { answer: string; id: number }>> = {};
  for (const answerEntry of answerEntries) {
    const { id, answer, questionId, subProblemId } = answerEntry;
    if (!responses[questionId]) responses[questionId] = {};
    responses[questionId][subProblemId] = { answer, id };
  }
  return responses;
}
export async function getAllAnswersForQuestion(
  userId: string,
  questionId: string,
  res: NextApiResponse
) {
  const answerEntries = await executeAndEndSet500OnError<AnswerResponse[]>(
    `
    SELECT questionId, subProblemId, answer, id
    FROM Answer
    WHERE questionId = ? AND userId = ?
    ORDER BY questionId, subProblemId
  `,
    [questionId, userId],
    res
  );

  if (!answerEntries) return;

  const responses: Record<string, Record<string, { answer: string; id: number }>> = {};
  for (const answerEntry of answerEntries) {
    const { id, answer, questionId, subProblemId } = answerEntry;
    if (!responses[questionId]) responses[questionId] = {};
    responses[questionId][subProblemId] = { answer, id };
  }
  return responses;
}

export async function getHomeworkOrSetError(
  homeworkId: number,
  getProblems: boolean,
  res: NextApiResponse
): Promise<HomeworkInfo | undefined> {
  const homeworks: any[] = await executeDontEndSet500OnError(
    `SELECT id, title, givenTs, dueTs, feedbackReleaseTs, courseId, css, courseInstance ${
      getProblems ? ', problems' : ''
    } 
    FROM homework 
    WHERE id = ?`,
    [homeworkId],
    res
  );
  if (!homeworks) return;
  if (!homeworks.length) {
    res.status(404).send('No homework found');
    return;
  }
  return homeworks[0];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  const homeworkId = +(req.query.id as string);
  if (!homeworkId || isNaN(homeworkId)) return res.status(422).send('Missing params.');
  const homework: HomeworkInfo = await getHomeworkOrSetError(+homeworkId, true, res);
  if (!homework) return;

  homework.problems = JSON.parse(homework.problems.toString());
  homework.css = JSON.parse(homework.css?.toString() ?? '[]');
  const phase = getHomeworkPhase(homework);

  const { courseId, courseInstance } = homework;
  const hwModeratorAction: ResourceActionParams = {
    name: ResourceName.COURSE_HOMEWORK,
    action: Action.MUTATE,
    variables: { courseId, instanceId: courseInstance },
  };
  const isModerator = await isUserIdAuthorizedForAny(userId, [hwModeratorAction]);
  homework.problems = getPhaseAppropriateProblems(homework.problems, isModerator, phase);

  const responses: Record<string, ResponseWithSubProblemId> = {};
  const answers = await getAllAnswersForHomeworkOrSetError(userId, homeworkId, undefined, res);
  if (!answers) return;
  for (const uri in homework.problems) {
    const problemAnswers = answers[uri];
    if (!responses[uri]) {
      responses[uri] = {
        // TODO ALEA4-P7
        problemId: uri,
        responses: [],
      };
    }
    Object.entries(problemAnswers || {}).forEach(([subProblemId, answerEntry]) => {
      // TODO ALEA4-P7
      responses[uri].responses.push({
        subProblemId: subProblemId,
        answer: answerEntry.answer,
      });
    });
  }
  const gradingInfo: Record<string, Record<string, GradingInfo[]>> = {};
  if (isModerator || phase === 'FEEDBACK_RELEASED') {
    for (const problemId in answers) {
      const subProblemIdToAnswerId = convertToSubProblemIdToAnswerId(answers[problemId]);
      const grades = await getAllGradingsOrSetError(subProblemIdToAnswerId, res);
      if (!grades) return;
      gradingInfo[problemId] = grades;
    }
  }

  res.status(200).json({ homework, responses, gradingInfo } /*as GetHomeworkResponse TODO(Behrooz)*/);
}
