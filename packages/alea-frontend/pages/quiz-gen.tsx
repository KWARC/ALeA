import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { getUserInfo, ProblemJson, QuizProblem, UserInfo } from '@stex-react/api';
import { PRIMARY_COL } from '@stex-react/utils';
import { CourseSectionSelector } from '../components/quiz-gen/CourseSectionSelector';
import { QuestionSidebar } from '../components/quiz-gen/QuizSidebar';
import { SecInfo } from '../types';
import { useRouter } from 'next/router';
import { QuizViewMode, ViewModeSelector } from '../components/quiz-gen/ViewModeSelector';
import { QuizPanel } from '../components/quiz-gen/QuizPanel';

export function getSectionNameFromIdOrUri(
  idOrUri: string | undefined,
  sections: SecInfo[]
): string {
  if (!idOrUri || !sections) return 'Unknown Section';
  const section = sections.find((s) => s.id === idOrUri || s.uri === idOrUri) || undefined;
  return section?.title?.replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, '') || 'Unknown Section';
}

export type FlatQuizProblem = Omit<QuizProblem, 'problemJson'> & ProblemJson;
export interface ExistingProblem {
  uri: string;
  sectionUri: string;
  sectionId: string;
}

export function isGenerated(p: FlatQuizProblem | ExistingProblem): p is FlatQuizProblem {
  return 'problemId' in p;
}

export function isExisting(p: FlatQuizProblem | ExistingProblem): p is ExistingProblem {
  return 'uri' in p && !('problemId' in p);
}
const QuizGen = () => {
  const [generatedProblems, setGeneratedProblems] = useState<FlatQuizProblem[]>([]);
  const [existingProblems, setExistingProblems] = useState<ExistingProblem[]>([]);
  const [latestGeneratedProblems, setLatestGeneratedProblems] = useState<FlatQuizProblem[]>([]);
  const [generatedIdx, setGeneratedIdx] = useState(0);
  const [existingIdx, setExistingIdx] = useState(0);
  const [allIdx, setAllIdx] = useState(0);
  const [viewMode, setViewMode] = useState<QuizViewMode>('all');
  const [sections, setSections] = useState<SecInfo[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const courseId = router.query.courseId as string;
  useEffect(() => { 
    getUserInfo().then((info) => {
      if (!info) {
        router.push('/login');
        return;
      }
      setUserInfo(info);
    });
  }, [router]);

  const currentIdx =
    viewMode === 'generated' ? generatedIdx : viewMode === 'existing' ? existingIdx : allIdx;

  const setCurrentIdx =
    viewMode === 'generated'
      ? setGeneratedIdx
      : viewMode === 'existing'
      ? setExistingIdx
      : setAllIdx;

  const problems = useMemo(() => {
    if (viewMode === 'generated') return generatedProblems;
    if (viewMode === 'existing') return existingProblems;
    return [...generatedProblems, ...existingProblems];
  }, [viewMode, generatedProblems, existingProblems]);

  return (
    <Box display="flex" height="100vh" bgcolor="#f4f6f8">
      <Box flex={1} px={4} py={3} overflow="auto">
        <Typography variant="h3" fontWeight="bold" textAlign="center" color={PRIMARY_COL} mb={3}>
          Quiz Builder
        </Typography>
        <CourseSectionSelector
          courseId={courseId}
          loading={loading}
          setLoading={setLoading}
          sections={sections}
          setSections={setSections}
          setExistingProblemUris={setExistingProblems}
          setGeneratedProblems={setGeneratedProblems}
          setLatestGeneratedProblems={setLatestGeneratedProblems}
        />
        <ViewModeSelector viewMode={viewMode} setViewMode={setViewMode} loading={loading} />

        <QuizPanel
          problems={problems}
          currentIdx={currentIdx}
          setCurrentIdx={setCurrentIdx}
          sections={sections}
          courseId={courseId}
          userInfo={userInfo}
        />
      </Box>
      <QuestionSidebar
        generatedProblems={generatedProblems}
        latestGeneratedProblems={latestGeneratedProblems}
        currentIdx={currentIdx}
        setCurrentIdx={setCurrentIdx}
        sections={sections}
        viewMode={viewMode}
        existingProblems={existingProblems}
      />
    </Box>
  );
};

export default QuizGen;
