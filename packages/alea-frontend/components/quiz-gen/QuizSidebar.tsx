import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { PRIMARY_COL } from '@stex-react/utils';
import { FlatQuizProblem, getSectionNameFromId } from 'packages/alea-frontend/pages/quiz-gen';
import { SecInfo } from 'packages/alea-frontend/types';
import { useState } from 'react';

export const QuestionSidebar = ({
  problems,
  sections = [],
  latestGeneratedProblems,
  currentIdx,
  setCurrentIdx,
  hideSections = false,
}: {
  problems: FlatQuizProblem[];
  sections?: SecInfo[];
  latestGeneratedProblems: FlatQuizProblem[];
  currentIdx: number;
  setCurrentIdx: (idx: number) => void;
  hideSections?: boolean;
}) => {
  const [tabIndex, setTabIndex] = useState(0);
  const remainingProblems = problems.filter((p) => !latestGeneratedProblems.includes(p));
  const tabs = [
    `Latest (${latestGeneratedProblems.length})`,
    `Earlier (${remainingProblems.length})`,
  ];
  const showTabs = latestGeneratedProblems.length > 0 && remainingProblems.length > 0;
  const currentTabProbs = tabIndex === 0 ? latestGeneratedProblems : remainingProblems;

  return (
    <Box
      flex={0.35}
      bgcolor="#ffffff"
      pl={3}
      pr={1}
      borderLeft="1px solid #ddd"
      boxShadow="-4px 0 12px rgba(0, 0, 0, 0.05)"
      maxHeight={'100vh'}
      overflow="auto"
    >
      <Typography
        variant="h6"
        mb={1}
        color={PRIMARY_COL}
        fontWeight="bold"
        sx={{
          position: 'sticky',
          top: -10,
          backgroundColor: '#ffffff',
          zIndex: 1,
          py: 1.5,
        }}
      >
        🧠 Questions
      </Typography>
      {showTabs && (
        <Tabs
          value={tabIndex}
          onChange={(e, newVal) => setTabIndex(newVal)}
          variant="fullWidth"
          sx={{ mb: 1.5 }}
        >
          {tabs.map((label, index) => (
            <Tab key={index} label={label} />
          ))}
        </Tabs>
      )}

      {currentTabProbs.length > 0 ? (
        <List dense component="ul">
          {currentTabProbs.map((p, idx) => {
            const isSelected = problems[currentIdx]?.problemId === p.problemId;

            return (
              <ListItemButton
                key={idx}
                onClick={() => {
                  const actualIndex = problems.findIndex((q) => q.problemId === p.problemId);
                  setCurrentIdx(actualIndex);
                }}
                selected={isSelected}
                sx={{
                  borderRadius: 2,
                  mb: 1.5,
                  bgcolor: isSelected ? '#e3f2fd' : '#fafafa',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: '#f1f8ff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  },
                  alignItems: 'flex-start',
                  px: 2,
                  py: 1.2,
                }}
              >
                <ListItemText
                  primary={
                    <Tooltip title={p.problem}>
                      <Typography
                        variant="subtitle2"
                        fontWeight={isSelected ? 600 : 500}
                        color="#0d47a1"
                      >
                        Q{idx + 1}: {p.problem.slice(0, 50)}...
                      </Typography>
                    </Tooltip>
                  }
                  secondary={
                    !hideSections ? (
                      <Typography
                        variant="caption"
                        sx={{
                          color: isSelected ? '#339fd1' : 'text.secondary',
                          fontWeight: 800,
                          wordBreak: 'break-word',
                          whiteSpace: 'normal',
                          overflowWrap: 'break-word',
                        }}
                      >
                        Section: {getSectionNameFromId(p.sectionId, sections)}
                      </Typography>
                    ) : null
                  }
                />
              </ListItemButton>
            );
          })}
        </List>
      ) : (
        <Box
          height="60%"
          display="flex"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          color="#aaa"
        >
          <Typography variant="body1">
            No questions yet.
            <br /> Please generate questions to see them here.
          </Typography>
        </Box>
      )}
    </Box>
  );
};
