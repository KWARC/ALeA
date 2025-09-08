import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
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
  onSelectGoal: (sectionUri: string, goalUri: string) => void;
  onToggleAll: (sectionUri: string) => void;
}

export const mockSectionGoals: SectionGoals = {
  'https://example.org/section1': [
    {
      goal_uri: 'https://example.org/goal1',
      description: 'Understand basics of databases',
      sub_goals: [
        {
          goal_uri: 'https://example.org/goal1a',
          description: 'Learn SQL basics',
          sub_goals: [],
        },
        {
          goal_uri: 'https://example.org/goal1b',
          description: 'Understand JSON and XML formats',
          sub_goals: [
            {
              goal_uri: 'https://example.org/goal1b1',
              description: 'Parse JSON data programmatically',
              sub_goals: [],
            },
          ],
        },
      ],
    },
    {
      goal_uri: 'https://example.org/goal2',
      description: 'Learn about relational database design',
      sub_goals: [
        {
          goal_uri: 'https://example.org/goal2a',
          description: 'Understand primary keys and foreign keys',
          sub_goals: [],
        },
        {
          goal_uri: 'https://example.org/goal2b',
          description: 'Normalize database tables',
          sub_goals: [],
        },
      ],
    },
  ],
  'https://example.org/section2': [
    {
      goal_uri: 'https://example.org/goal3',
      description: 'Understand NoSQL databases',
      sub_goals: [
        {
          goal_uri: 'https://example.org/goal3a',
          description: 'Learn about document databases',
          sub_goals: [],
        },
        {
          goal_uri: 'https://example.org/goal3b',
          description: 'Understand key-value stores',
          sub_goals: [],
        },
      ],
    },
    {
      goal_uri: 'https://example.org/goal4',
      description: 'Explore distributed databases',
      sub_goals: [
        {
          goal_uri: 'https://example.org/goal4a',
          description: 'Understand replication strategies',
          sub_goals: [],
        },
        {
          goal_uri: 'https://example.org/goal4b',
          description: 'Learn about sharding techniques',
          sub_goals: [
            {
              goal_uri: 'https://example.org/goal4b1',
              description: 'Implement basic sharding in a test database',
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
      const isSelected = currentSelectedGoals.includes(goal.goal_uri);
      const hasSubGoals = goal.sub_goals && goal.sub_goals.length > 0;
      const isExpanded = expandedAccordions.has(goal.goal_uri);

      if (hasSubGoals) {
        return (
          <Box key={goal.goal_uri} sx={{ mb: 1 }}>
            <Accordion
              expanded={isExpanded}
              onChange={handleAccordionChange(goal.goal_uri)}
              sx={{
                boxShadow: level === 0 ? 2 : 1,
                borderRadius: 1,
                '&:before': { display: 'none' },
                ml: level * 2,
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  bgcolor: level === 0 ? 'grey.50' : 'grey.25',
                  minHeight: 48,
                  '&.Mui-expanded': {
                    minHeight: 48,
                  },
                  '& .MuiAccordionSummary-content': {
                    alignItems: 'center',
                    margin: '8px 0',
                    '&.Mui-expanded': {
                      margin: '8px 0',
                    },
                  },
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        onSelectGoal(startSectionUri, goal.goal_uri);
                      }}
                      size="small"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {goal.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {goal.goal_uri}
                      </Typography>
                    </Box>
                  }
                  sx={{
                    margin: 0,
                    flex: 1,
                    '& .MuiFormControlLabel-label': {
                      flex: 1,
                      ml: 1,
                    },
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                {renderGoalTree(goal.sub_goals, level + 1)}
              </AccordionDetails>
            </Accordion>
          </Box>
        );
      } else {
        return (
          <Box key={goal.goal_uri} sx={{ pl: level * 2, py: 0.5, mb: 1 }}>
            <Paper
              elevation={1}
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: 'background.paper',
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isSelected}
                    onChange={() => onSelectGoal(startSectionUri, goal.goal_uri)}
                    size="small"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {goal.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {goal.goal_uri}
                    </Typography>
                  </Box>
                }
                sx={{
                  margin: 0,
                  width: '100%',
                  alignItems: 'flex-start',
                  '& .MuiFormControlLabel-label': {
                    flex: 1,
                    ml: 1,
                  },
                }}
              />
            </Paper>
          </Box>
        );
      }
    });

  return (
    <Paper
      elevation={3}
      sx={{
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        mb: 2,
      }}
    >
      <Box
        sx={{
          bgcolor: 'primary.light',
          color: 'primary.contrastText',
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          Selecting Goals
        </Typography>
        <Button
          variant="outlined"
          size="small"
          sx={{
            color: 'inherit',
            borderColor: 'currentColor',
          }}
          onClick={() => onToggleAll(startSectionUri)}
        >
          Deselect All
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {currentSectionGoals.length === 0 ? (
          <Box p={3} textAlign="center">
            <Typography color="text.secondary" variant="body2" fontStyle="italic">
              No goals available for selected sections
            </Typography>
          </Box>
        ) : (
          renderGoalTree(currentSectionGoals)
        )}
      </Box>
      {currentSelectedGoals.length > 0 && (
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            {currentSelectedGoals.length} goal{currentSelectedGoals.length !== 1 ? 's' : ''}{' '}
            selected
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
