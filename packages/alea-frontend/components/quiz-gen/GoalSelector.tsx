import { Box, Checkbox, FormControlLabel, Paper, Typography, Button, Divider } from '@mui/material';
import React from 'react';

export interface Goal {
  goal_uri: string;
  description: string;
  sub_goals: Goal[];
}

export interface SectionGoals {
  [section_uri: string]: Goal[];
}

// Mock data for goals
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

interface GoalSelectorProps {
  sectionGoals: SectionGoals;
  selectedGoals: { [conceptUri: string]: string[] }; 
  startSectionUri: string;
  endSectionUri: string;
  onToggleAll: () => void;
  onSelectGoal: (goalUri: string) => void;
}

const flattenGoals = (goals: Goal[]): Goal[] => {
  const flatGoals: Goal[] = [];

  const flatten = (goalList: Goal[]) => {
    goalList.forEach((goal) => {
      flatGoals.push(goal);
      if (goal.sub_goals && goal.sub_goals.length > 0) {
        flatten(goal.sub_goals);
      }
    });
  };

  flatten(goals);
  return flatGoals;
};

export const GoalSelector: React.FC<GoalSelectorProps> = ({
  sectionGoals,
  selectedGoals,
  startSectionUri,
  endSectionUri,
  onToggleAll,
  onSelectGoal,
}) => {
  const currentSectionGoals = sectionGoals[startSectionUri] || [];
  const allGoals = flattenGoals(currentSectionGoals);

  const currentSelectedGoals = selectedGoals[startSectionUri] || [];

  const allSelected = allGoals.length > 0 && currentSelectedGoals.length === allGoals.length;
  const someSelected =
    currentSelectedGoals.length > 0 && currentSelectedGoals.length < allGoals.length;

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
          bgcolor: 'primary.main',
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
          onClick={onToggleAll}
          sx={{
            color: 'inherit',
            borderColor: 'currentColor',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.1)',
              borderColor: 'currentColor',
            },
          }}
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {allGoals.length === 0 ? (
          <Box p={3} textAlign="center">
            <Typography color="text.secondary" variant="body2" fontStyle="italic">
              No goals available for selected sections
            </Typography>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={1}>
            {allGoals.map((goal, index) => (
              <Box key={goal.goal_uri}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={currentSelectedGoals.includes(goal.goal_uri)}
                      onChange={() => onSelectGoal(goal.goal_uri)}
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
                {index < allGoals.length - 1 && <Divider sx={{ my: 1, opacity: 0.3 }} />}
              </Box>
            ))}
          </Box>
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
