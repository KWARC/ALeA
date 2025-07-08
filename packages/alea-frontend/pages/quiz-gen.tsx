import React, { useState } from 'react';
import { Box, Typography, Chip, Tooltip, Card } from '@mui/material';
import { Folder } from '@mui/icons-material';
import { ProblemJson, QuizProblem } from '@stex-react/api';
import { QuizProblemViewer } from '../components/GenerateQuiz';
import { PRIMARY_COL } from '@stex-react/utils';
import { ListStepper } from '@stex-react/stex-react-renderer';
import { FeedbackSection } from '../components/quiz-gen/Feedback';
import { CourseSectionSelector } from '../components/quiz-gen/CourseSectionSelector';
import { QuestionSidebar } from '../components/quiz-gen/QuizSidebar';
import { SecInfo } from '../types';

export type FlatQuizProblem = Omit<QuizProblem, 'problemJson'> & ProblemJson;

export function getSectionNameFromId(id: string, sections: SecInfo[]): string {
  if (!sections) return 'Unknown Section';
  return (
    sections.find((s) => s.id === id)?.title?.replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, '') ||
    'Unknown Section'
  );
}

const QuizGen = () => {
  const [problems, setProblems] = useState<FlatQuizProblem[]>([]);
  const [latestGeneratedProblems, setLatestGeneratedProblems] = useState<FlatQuizProblem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sections, setSections] = useState<SecInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const currentProblem = problems[currentIdx];

  const handleClick = () => {
    const url = `/course-view/${currentProblem.courseId}?sectionId=${encodeURIComponent(
      currentProblem.sectionId
    )}`;
    window.open(url, '_blank');
  };

  return (
    <Box display="flex" height="100vh" bgcolor="#f4f6f8">
      <Box flex={1} px={4} py={3} overflow="auto">
        <Typography variant="h3" fontWeight="bold" textAlign="center" color={PRIMARY_COL} mb={3}>
          Quiz Builder
        </Typography>

        <CourseSectionSelector
          loading={loading}
          setLoading={setLoading}
          sections={sections}
          setSections={setSections}
          setProblems={setProblems}
          setLatestGeneratedProblems={setLatestGeneratedProblems}
        />

        <Box mt={3}>
          {currentProblem ? (
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" color="#0d47a1">
                  Question {currentIdx + 1} of {problems.length}
                </Typography>
                <Tooltip title="Go to this section">
                  <Chip
                    icon={<Folder style={{ color: '#bbdefb' }} />}
                    label={`Section: ${getSectionNameFromId(currentProblem.sectionId, sections)}`}
                    variant="outlined"
                    onClick={handleClick}
                    clickable
                    sx={{
                      color: '#1976d2',
                      borderColor: '#1976d2',
                      fontWeight: 500,
                    }}
                  />
                </Tooltip>
              </Box>

              <ListStepper
                idx={currentIdx}
                listSize={problems.length}
                onChange={(idx) => setCurrentIdx(idx)}
              />

              <QuizProblemViewer problemData={currentProblem} />

              <FeedbackSection
                key={currentProblem.problemId}
                problemId={currentProblem.problemId}
              />
            </Card>
          ) : (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight="50vh"
              border="2px dashed #ccc"
              borderRadius={2}
              color="#999"
            >
              <Typography variant="h6">Generate a quiz to see them here!</Typography>
            </Box>
          )}
        </Box>
      </Box>
      <QuestionSidebar
        problems={problems}
        sections={sections}
        latestGeneratedProblems={latestGeneratedProblems}
        currentIdx={currentIdx}
        setCurrentIdx={setCurrentIdx}
      />
    </Box>
  );
};

export default QuizGen;
