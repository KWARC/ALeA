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
import { useMemo, useState } from 'react';
import {
  ExistingProblem,
  FlatQuizProblem,
  getSectionNameFromIdOrUri,
  isGenerated,
} from '../../pages/quiz-gen';
import { SecInfo } from '../../types';
import { UrlNameExtractor } from '../LoListDisplay';
import { QuizViewMode } from './ViewModeSelector';

export const QuestionSidebar = ({
  sections = [],
  generatedProblems = [],
  latestGeneratedProblems,
  viewMode = 'all',
  currentIdx,
  setCurrentIdx,
  hideSections = false,
  existingProblems = [],
}: {
  sections?: SecInfo[];
  viewMode?: QuizViewMode;
  generatedProblems?: FlatQuizProblem[];
  latestGeneratedProblems: FlatQuizProblem[];
  currentIdx: number;
  setCurrentIdx: (idx: number) => void;
  hideSections?: boolean;
  existingProblems?: ExistingProblem[];
}) => {
  const [tabIndex, setTabIndex] = useState(0);

  const remainingProblems = generatedProblems.filter(
    (p) => !latestGeneratedProblems.some((latest) => latest.problemId === p.problemId)
  );
  const hasLatestProblems = latestGeneratedProblems.length > 0;
  const currentTabProbs: (FlatQuizProblem | ExistingProblem)[] = useMemo(() => {
    if (viewMode === 'generated') {
      if (!hasLatestProblems) return generatedProblems;
      return tabIndex === 0 ? latestGeneratedProblems : remainingProblems;
    }
    if (viewMode === 'existing') return existingProblems;
    return [...generatedProblems, ...existingProblems];
  }, [
    viewMode,
    tabIndex,
    generatedProblems,
    latestGeneratedProblems,
    remainingProblems,
    existingProblems,
  ]);
  const tabs = [
    `Latest (${latestGeneratedProblems.length})`,
    `Earlier (${remainingProblems.length})`,
  ];
  const showTabs =
    viewMode === 'generated' && latestGeneratedProblems.length > 0 && remainingProblems.length > 0;

  return (
    <Box
      flex={0.35}
      bgcolor="#ffffff"
      pl={3}
      pr={1}
      borderLeft="1px solid #ddd"
      boxShadow="-4px 0 12px rgba(0, 0, 0, 0.05)"
      maxHeight="100vh"
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
          {currentTabProbs.map((item, idx) => {
            const isSelected = currentIdx === idx;

            const content = isGenerated(item) ? (
              <Tooltip title={item.problem}>
                <Typography variant="subtitle2" fontWeight={isSelected ? 600 : 500} color="#0d47a1">
                  Q{idx + 1}: {item.problem.slice(0, 50)}...
                </Typography>
              </Tooltip>
            ) : (
              <Typography
                variant="subtitle2"
                display="inline"
                fontWeight={isSelected ? 600 : 500}
                color="#0d47a1"
              >
                Q{idx + 1}: <UrlNameExtractor url={item.uri} />
              </Typography>
            );

            const sectionText = isGenerated(item)
              ? getSectionNameFromIdOrUri(item.sectionId, sections) //TODO check again
              : getSectionNameFromIdOrUri(item.sectionUri, sections);

            return (
              <ListItemButton
                key={idx}
                onClick={() => setCurrentIdx(idx)}
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
                  primary={content}
                  secondary={
                    !hideSections &&
                    sectionText && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: isSelected ? '#339fd1' : 'text.secondary',
                          fontWeight: 800,
                          wordBreak: 'break-word',
                        }}
                      >
                        Section: {sectionText}
                      </Typography>
                    )
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
