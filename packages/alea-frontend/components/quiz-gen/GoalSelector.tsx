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
import { Goal, SectionGoals } from './SectionDetailsDialog';

interface GoalSelectorProps {
  sectionGoals: SectionGoals;
  selectedGoals: { [conceptUri: string]: string[] };
  startSectionUri: string;
  endSectionUri: string;
  onSelectGoal: (sectionUri: string, goalUri: string, description: string) => void;
  onToggleAll: (sectionUri: string) => void;
}

const GOAL_COLORS = {
  selected: '#e3f2fd',
  selectedBorder: '#1976d2',
  hover: '#f5f5f5',
  headerBg: '#fafafa',
  subGoalBg: '#fbfbfb',
};

export const mockSectionGoals: SectionGoals = {
  'https://example.org/section1': [
    {
      goal_uri: 'https://example.org/goal1',
      text: 'Understand basics of databases',
      sub_goals: [
        {
          goal_uri: 'https://example.org/goal1a',
          text: 'Learn SQL basics',
          sub_goals: [],
        },
        {
          goal_uri: 'https://example.org/goal1b',
          text: 'Understand JSON and XML formats',
          sub_goals: [
            {
              goal_uri: 'https://example.org/goal1b1',
              text: 'Parse JSON data programmatically',
              sub_goals: [],
            },
          ],
        },
      ],
    },
    {
      goal_uri: 'https://example.org/goal2',
      text: 'Learn about relational database design',
      sub_goals: [
        {
          goal_uri: 'https://example.org/goal2a',
          text: 'Understand primary keys and foreign keys',
          sub_goals: [],
        },
        {
          goal_uri: 'https://example.org/goal2b',
          text: 'Normalize database tables',
          sub_goals: [],
        },
      ],
    },
  ],
  'https://example.org/section2': [
    {
      goal_uri: 'https://example.org/goal3',
      text: 'Understand NoSQL databases',
      sub_goals: [
        {
          goal_uri: 'https://example.org/goal3a',
          text: 'Learn about document databases',
          sub_goals: [],
        },
        {
          goal_uri: 'https://example.org/goal3b',
          text: 'Understand key-value stores',
          sub_goals: [],
        },
      ],
    },
    {
      goal_uri: 'https://example.org/goal4',
      text: 'Explore distributed databases',
      sub_goals: [
        {
          goal_uri: 'https://example.org/goal4a',
          text: 'Understand replication strategies',
          sub_goals: [],
        },
        {
          goal_uri: 'https://example.org/goal4b',
          text: 'Learn about sharding techniques',
          sub_goals: [
            {
              goal_uri: 'https://example.org/goal4b1',
              text: 'Implement basic sharding in a test database',
              sub_goals: [],
            },
          ],
        },
      ],
    },
  ],
};

export const GoalSelector: React.FC<GoalSelectorProps> = ({
  sectionGoals,
  selectedGoals,
  startSectionUri,
  endSectionUri,
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

  const currentSectionGoals = sectionGoals?.[startSectionUri] || [];
  const currentSelectedGoals = selectedGoals?.[startSectionUri] || [];

  const renderGoalTree = (goals: Goal[], level = 0): React.ReactNode =>
    goals.map((goal) => {
      const isSelected = currentSelectedGoals.includes(goal.text);
      const hasSubGoals = goal.sub_goals && goal.sub_goals.length > 0;
      const isExpanded = expandedAccordions.has(goal.goal_uri);

      if (hasSubGoals) {
        return (
          <Box key={goal.goal_uri} sx={{ mb: 1 }}>
            <Accordion
              expanded={isExpanded}
              onChange={handleAccordionChange(goal.goal_uri)}
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
                  '&.Mui-expanded': {
                    minHeight: 56,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  },
                  '& .MuiAccordionSummary-content': {
                    alignItems: 'center',
                    margin: '12px 0',
                    '&.Mui-expanded': {
                      margin: '12px 0',
                    },
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 2 }}>
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      onSelectGoal(startSectionUri, goal.goal_uri, goal.text);
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
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: 'block',
                        mt: 0.5,
                        fontSize: '0.75rem',
                        opacity: 0.7,
                      }}
                    >
                      {goal.goal_uri.split('/').pop()}
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 1, pb: 2, px: 2, bgcolor: '#fafafa' }}>
                <Box sx={{ '& > *:not(:last-child)': { mb: 1.5 } }}>
                  {renderGoalTree(goal.sub_goals, level + 1)}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        );
      } else {
        return (
          <Box key={goal.goal_uri} sx={{ pl: level * 2, py: 0.5, mb: 1 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: '1px solid',
                borderColor: isSelected ? GOAL_COLORS.selectedBorder : 'divider',
                bgcolor: isSelected ? GOAL_COLORS.selected : 'background.paper',
                boxShadow: isSelected
                  ? '0 2px 8px rgba(25, 118, 210, 0.15)'
                  : '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: isSelected ? GOAL_COLORS.selected : GOAL_COLORS.hover,
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                },
                ml: level * 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Checkbox
                  checked={isSelected}
                  onChange={() => onSelectGoal(startSectionUri, goal.goal_uri, goal.text)}
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
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      fontSize: '0.75rem',
                      opacity: 0.7,
                    }}
                  >
                    {goal.goal_uri.split('/').pop()}
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
          Deselect All
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
