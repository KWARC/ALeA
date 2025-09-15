import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Paper,
  Typography,
} from '@mui/material';
import React from 'react';
import { GoalNode, SectionGoals } from './SectionDetailsDialog';

interface GoalSelectorProps {
  sectionGoals: SectionGoals;
  selectedGoals: { [conceptUri: string]: string[] };
  startSectionUri: string;
  onSelectGoal: (sectionUri: string, goalUri: string, text: string) => void;
  onToggleAll: (sectionUri: string) => void;
}

const GOAL_COLORS = {
  selected: '#e3f2fd',
  selectedBorder: '#1976d2',
  hover: '#f5f5f5',
  headerBg: '#fafafa',
  subGoalBg: '#fbfbfb',
};

function flattenGoals(goals: GoalNode[]): string[] {
  return goals.flatMap((g) => [g.uri, ...flattenGoals(g.subGoals || [])]);
}

export const GoalSelector: React.FC<GoalSelectorProps> = ({
  sectionGoals,
  selectedGoals,
  startSectionUri,
  onToggleAll,
  onSelectGoal,
}) => {
  const [expandedAccordions, setExpandedAccordions] = React.useState<Set<string>>(new Set());
  const handleAccordionChange =
    (goalUri: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      const newExpanded = new Set(expandedAccordions);
      if (isExpanded) {
        newExpanded.add(goalUri);
      } else {
        newExpanded.delete(goalUri);
      }
      setExpandedAccordions(newExpanded);
    };

  const currentSectionGoals = sectionGoals[startSectionUri] || [];
  const allGoalUris = flattenGoals(currentSectionGoals);
  const currentSelectedGoals = selectedGoals[startSectionUri] || [];

  const renderGoalTree = (goals: GoalNode[], level = 0): React.ReactNode =>
    goals.map((goal) => {
      const isSelected = currentSelectedGoals.includes(goal.text);
      const hasSubGoals = goal.subGoals && goal.subGoals.length > 0;
      const isExpanded = expandedAccordions.has(goal.uri);

      if (hasSubGoals) {
        return (
          <Box key={goal.uri} sx={{ mb: 1 }}>
            <Accordion
              expanded={isExpanded}
              onChange={handleAccordionChange(goal.uri)}
              sx={{
                backgroundColor: isSelected ? GOAL_COLORS.selected : 'background.paper',
                border: `1px solid ${isSelected ? GOAL_COLORS.selectedBorder : 'divider'}`,
                borderRadius: `${12}px !important`,
                boxShadow: isSelected
                  ? '0 2px 8px rgba(25, 118, 210, 0.15)'
                  : '0 1px 3px rgba(0,0,0,0.05)',
                '&:before': { display: 'none' },
                '&:hover': {
                  backgroundColor: isSelected ? GOAL_COLORS.selected : GOAL_COLORS.hover,
                  transform: 'translateY(-1px)',
                  transition: 'all 0.2s ease-in-out',
                },
                ml: level * 3,
                overflow: 'hidden',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
                sx={{
                  bgcolor: 'transparent',
                  minHeight: 56,
                  px: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 2 }}>
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      onSelectGoal(startSectionUri, goal.uri, goal.text);
                    }}
                    size="small"
                    sx={{
                      color: 'text.secondary',
                      '&.Mui-checked': {
                        color: 'primary.main',
                      },
                      mt: -0.5,
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="body1"
                      fontWeight={level === 0 ? 600 : 500}
                      color={isSelected ? 'primary.main' : 'text.primary'}
                      sx={{ lineHeight: 1.4 }}
                    >
                      {goal.text}
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 1, pb: 2, px: 2, bgcolor: '#fafafa' }}>
                <Box sx={{ '& > *:not(:last-child)': { mb: 1.5 } }}>
                  {renderGoalTree(goal.subGoals, level + 1)}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        );
      } else {
        return (
          <Box key={goal.uri} sx={{ pl: level * 2, py: 0.5, mb: 1 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: '1px solid',
                borderColor: isSelected ? GOAL_COLORS.selectedBorder : 'divider',
                bgcolor: isSelected ? GOAL_COLORS.selected : 'background.paper',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Checkbox
                  checked={isSelected}
                  onChange={() => onSelectGoal(startSectionUri, goal.uri, goal.text)}
                  size="small"
                  sx={{
                    color: 'text.secondary',
                    '&.Mui-checked': {
                      color: 'primary.main',
                    },
                    mt: -0.5,
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    fontWeight={500}
                    color={isSelected ? 'primary.main' : 'text.primary'}
                    sx={{ lineHeight: 1.4 }}
                  >
                    {goal.text}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        );
      }
    });

  return (
    <Paper
      elevation={3}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        mb: 2,
      }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '2px solid',
          borderColor: 'primary.main',
          p: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <Typography variant="h6" fontWeight="600" color="primary.main">
          Learning Goals Selection
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ExpandMoreIcon sx={{ transform: 'rotate(180deg)' }} />}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
          }}
          onClick={() => onToggleAll(startSectionUri)}
        >
          {currentSelectedGoals.length === allGoalUris.length ? 'Deselect All' : 'Select All'}
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 3, bgcolor: '#fafafa' }}>
        {currentSectionGoals.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary" variant="body1" fontStyle="italic">
              No goals available for selected sections
            </Typography>
          </Box>
        ) : (
          <Box sx={{ '& > *:not(:last-child)': { mb: 2 } }}>
            {renderGoalTree(currentSectionGoals)}
          </Box>
        )}
      </Box>
      {currentSelectedGoals.length > 0 && (
        <Box
          sx={{
            p: 2.5,
            bgcolor: 'primary.50',
            borderTop: '2px solid',
            borderColor: 'primary.main',
            position: 'sticky',
            bottom: 0,
          }}
        >
          <Typography
            variant="body2"
            color="primary.main"
            fontWeight={600}
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            ✓ {currentSelectedGoals.length} goal{currentSelectedGoals.length !== 1 ? 's' : ''}{' '}
            selected
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
