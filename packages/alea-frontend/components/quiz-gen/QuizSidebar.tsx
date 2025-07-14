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
import { FlatQuizProblem, getSectionNameFromIdOrUri } from '../../pages/quiz-gen';
import { SecInfo } from '../../types';
import { UrlNameExtractor } from '../LoListDisplay';

export const QuestionSidebar = ({
  problems,
  sections = [],
  generatedProblems = [],
  latestGeneratedProblems,
  viewMode = 'all',
  currentIdx,
  setCurrentIdx,
  hideSections = false,
  existingProblems = [],
}: {
  problems: any;
  sections?: SecInfo[];
  viewMode?: 'generated' | 'existing' | 'all';
  generatedProblems?: FlatQuizProblem[];
  latestGeneratedProblems: FlatQuizProblem[];
  currentIdx: number;
  setCurrentIdx: (idx: number) => void;
  hideSections?: boolean;
  existingProblems?: { uri: string; sectionUri: string }[];
}) => {
  const [tabIndex, setTabIndex] = useState(0);

  const remainingProblems = generatedProblems.filter(
    (p) => !latestGeneratedProblems.some((latest) => latest.problemId === p.problemId)
  );

  const tabs = [
    `Latest (${latestGeneratedProblems.length})`,
    `Earlier (${remainingProblems.length})`,
  ];

  const showTabs =
    viewMode === 'generated' && latestGeneratedProblems.length > 0 && remainingProblems.length > 0;

  const hasRemaining = remainingProblems.length > 0;

  const currentTabProbs: any = useMemo(() => {
    if (viewMode === 'generated') {
      if (!hasRemaining) {
        return generatedProblems.map((p) => ({
          type: 'generated',
          data: p,
        }));
      }

      return tabIndex === 0
        ? latestGeneratedProblems.map((p) => ({ type: 'generated', data: p }))
        : remainingProblems.map((p) => ({ type: 'generated', data: p }));
    }

    if (viewMode === 'existing') {
      return existingProblems.map((data) => ({
        type: 'existing',
        data: data,
      }));
    }

    return [
      ...generatedProblems.map((p) => ({ type: 'generated', data: p })),
      ...existingProblems.map((data) => ({ type: 'existing', data: data })),
    ];
  }, [
    viewMode,
    tabIndex,
    generatedProblems,
    latestGeneratedProblems,
    remainingProblems,
    existingProblems,
  ]);

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

            const content =
              item.type === 'generated' ? (
                <Tooltip title={item.data.problem}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={isSelected ? 600 : 500}
                    color="#0d47a1"
                  >
                    Q{idx + 1}: {item.data.problem.slice(0, 50)}...
                  </Typography>
                </Tooltip>
              ) : (
                <Typography variant="subtitle2" fontWeight={isSelected ? 600 : 500} color="#0d47a1">
                  Q{idx + 1}: <UrlNameExtractor url={item.data?.uri} />
                </Typography>
              );

            const sectionText =
              item.type === 'generated'
                ? getSectionNameFromIdOrUri(item.data.sectionId, sections)
                : '';

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
                    item.type === 'generated' &&
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
