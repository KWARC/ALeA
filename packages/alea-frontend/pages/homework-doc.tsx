import {
  FTMLProblemWithSolution,
  getHomework,
  getHomeworkPhase,
  GetHomeworkResponse,
  getUserInfo,
  GradingInfo,
  ResponseWithSubProblemId,
  UserInfo,
} from '@alea/spec';
import {
  AnswerContext,
  GradingContext,
  QuizDisplay,
  ShowGradingFor,
} from '@alea/stex-react-renderer';
import { isFauId } from '@alea/utils';
import { FTML, injectCss } from '@flexiformal/ftml';
import { Box, CircularProgress } from '@mui/material';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { ForceFauLogin } from '../components/ForceFAULogin';
import MainLayout from '../layouts/MainLayout';

const HomeworkDocPage: React.FC = () => {
  const router = useRouter();

  const [problems, setProblems] = useState<Record<string, FTMLProblemWithSolution>>({});
  const [userInfo, setUserInfo] = useState<UserInfo | undefined | null>(null);
  const [fetchingUserInfo, setFetchingUserInfo] = useState(false);
  const [fetchingHomework, setFetchingHomework] = useState(false);
  const [hwInfo, setHwInfo] = useState<GetHomeworkResponse | undefined>(undefined);

  const [forceFauLogin, setForceFauLogin] = useState(false);

  const [subProblemInfoToGradingInfo, setSubProblemInfoToGradingInfo] = useState<
    Record<string, GradingInfo[]>
  >({});

  useEffect(() => {
    setFetchingUserInfo(true);
    getUserInfo()
      .then((i) => {
        setUserInfo(i);
        const uid = i?.userId;
        if (!uid) return;
        isFauId(uid) ? setForceFauLogin(false) : setForceFauLogin(true);
      })
      .finally(() => {
        setFetchingUserInfo(false);
      });
  }, []);
  const courseId = hwInfo?.homework.courseId;
  const instanceId = hwInfo?.homework.courseInstance;

  const [answers, setAnswers] = useState<Record<string, ResponseWithSubProblemId>>({});

  const id = router.query.id as string;
  const [responses, setResponses] = useState<Record<string, FTML.ProblemResponse>>();

  useEffect(() => {
    if (!router.isReady) return;
    if (Number.isNaN(+id)) {
      alert('Invalid homework id');
      router.replace('/');
    }
    setFetchingHomework(true);
    getHomework(+id)
      .then((hwInfo) => {
        setHwInfo(hwInfo);
        injectCss(hwInfo.homework.css);
        setProblems(hwInfo.homework.problems);
        setAnswers(hwInfo.responses);
        const mildleToMapProblemResponse: Record<string, FTML.ProblemResponse> = {};
        Object.entries(answers).forEach(([id, answers]) => {
          mildleToMapProblemResponse[id] = { uri: id, responses: [] };
          answers.responses.forEach(
            (c) => (mildleToMapProblemResponse[id].responses[c.subProblemId] = c.answer)
          );
        });
        setResponses(mildleToMapProblemResponse);
      })
      .finally(() => {
        setFetchingHomework(false);
      });
  }, [router.isReady, id]);

  const phase = hwInfo && getHomeworkPhase(hwInfo.homework);

  if (forceFauLogin) {
    return (
      <MainLayout title={`${courseId ?? ''} Homework | ALeA`}>
        <ForceFauLogin />
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`${courseId ?? ''} Homework | ALeA`}>
      <Box>
        {fetchingUserInfo || fetchingHomework ? (
          <CircularProgress />
        ) : !userInfo ? (
          <Box p="20px">You must be logged in to see homeworks.</Box>
        ) : !phase || phase === 'NOT_GIVEN' ? (
          <Box>Homework is invalid or not yet given.</Box>
        ) : (
          <GradingContext.Provider
            value={{
              showGradingFor: ShowGradingFor.INSTRUCTOR,
              isGrading: false,
              showGrading: true,
              gradingInfo: hwInfo?.gradingInfo,
              studentId: 'fake_abc',
            }}
          >
            <AnswerContext.Provider value={hwInfo.responses}>
              <QuizDisplay
                isFrozen={phase !== 'GIVEN'}
                showPerProblemTime={false}
                problems={problems}
                existingResponses={responses}
                homeworkId={+id}
                onResponse={async (problemId, response) => {
                  /*for (const [idx, answer] of Object.entries(response.freeTextResponses)) {
                  const answerAccepted = await createAnswer({
                    homeworkId: +id,
                    questionId: problemId,
                    subProblemId: idx,
                    answer,
                    questionTitle: problems[problemId].problem.title_html,
                    courseId,
                  });
                  if (!answerAccepted) {
                    alert('Answers are no longer being accepted');
                    location.reload();
                  }
                } TODO ALEA4-P4*/
                }}
              />
            </AnswerContext.Provider>
          </GradingContext.Provider>
        )}
      </Box>
    </MainLayout>
  );
};

export default HomeworkDocPage;
