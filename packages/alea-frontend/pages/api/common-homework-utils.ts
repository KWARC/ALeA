import { GradingItem, ReviewType } from '@alea/spec';
import { NextApiResponse } from 'next';
import { executeAndEndSet500OnError } from './comment-utils';

interface PerSubProblemGradingType {
  homeworkId: number;
  questionId: string;
  studentId: string;
  answerId: number;
  subProblemId: string;
  reviewType?: ReviewType;

  updatedAt: string;
}

export async function getGradingItemsOrSetError(
  courseId: string,
  instanceId: string,
  isPeerGrading: boolean,
  res: NextApiResponse
): Promise<GradingItem[]> {
  const gradingList: PerSubProblemGradingType[] = await executeAndEndSet500OnError(
    `SELECT 
            a.homeworkId AS homeworkId,
            a.questionId AS questionId,
            a.subProblemId AS subProblemId,
            a.userId AS studentId,
            g.reviewType AS reviewType,
            MAX(a.updatedAt) AS updatedAt,
            a.id AS answerId
        FROM Answer a LEFT JOIN Grading g ON a.id = g.answerId
        WHERE a.courseId = ? AND a.courseInstance = ?
        GROUP BY homeworkId, questionId, subProblemId, userId, reviewType ,a.id 
        `,
    [courseId, instanceId],
    res
  );
  if (!gradingList) return [];
  const gradingItemsMap: {
    [key: string]: Omit<
      GradingItem,
      'numSubProblemsAnswered' | 'numSubProblemsGraded' | 'numSubProblemsInstructorGraded'
    > & {
      subProblemsAnswered: Set<string>;
      subProblemsGraded: Set<string>;
      subProblemsInstructorGraded: Set<string>;
    };
  } = {};
  gradingList.forEach((i) => {
    const key = `${i.homeworkId}-${i.questionId}-${i.studentId}`;
    if (!gradingItemsMap[key]) {
      gradingItemsMap[key] = {
        homeworkId: i.homeworkId,
        questionId: i.questionId,
        studentId: i.studentId,
        answerId: i.answerId,
        updatedAt: i.updatedAt,
        subProblemsAnswered: new Set(),
        subProblemsGraded: new Set(),
        subProblemsInstructorGraded: new Set(),
      };
    }

    gradingItemsMap[key].subProblemsAnswered.add(i.subProblemId);
    if (i.updatedAt > gradingItemsMap[key].updatedAt) gradingItemsMap[key].updatedAt = i.updatedAt;
    if (i.reviewType) {
      gradingItemsMap[key].subProblemsGraded.add(i.subProblemId);
      if (i.reviewType === ReviewType.INSTRUCTOR) {
        gradingItemsMap[key].subProblemsInstructorGraded.add(i.subProblemId);
      }
    }
  });

  return Object.values(gradingItemsMap).map((i) => {
    const {
      subProblemsAnswered,
      subProblemsGraded,
      subProblemsInstructorGraded,
      studentId,
      ...rest
    } = i;
    return {
      ...rest,
      studentId: isPeerGrading ? Math.random().toString() : studentId,
      numSubProblemsAnswered: subProblemsAnswered?.size ?? 0,
      numSubProblemsGraded: subProblemsGraded?.size ?? 0,
      numSubProblemsInstructorGraded: subProblemsInstructorGraded?.size ?? 0,
    } as GradingItem;
  });
}
