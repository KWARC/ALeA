import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { conceptUriToName } from '@stex-react/api';
import { PRIMARY_COL } from '@stex-react/utils';
import React from 'react';
import { ConceptProperty } from './SectionDetailsDialog';

interface ConceptDetailsProps {
  selectedConcepts: { label: string; value: string }[];
  currentIndex: number;
  conceptProperties: { [conceptUri: string]: ConceptProperty[] };
  selectedProperties: { [conceptUri: string]: string[] };
  onPrevious: () => void;
  onNext: () => void;
  onSelectAllProperties: (conceptUri: string) => void;
  onClearAllProperties: (conceptUri: string) => void;
  onToggleProperty: (conceptUri: string, propertyKey: string, idx: number) => void;
}

export const ConceptDetails: React.FC<ConceptDetailsProps> = ({
  selectedConcepts,
  currentIndex,
  conceptProperties,
  selectedProperties,
  onPrevious,
  onNext,
  onSelectAllProperties,
  onClearAllProperties,
  onToggleProperty,
}) => {
  if (selectedConcepts.length === 0 || currentIndex < 0) {
    return (
      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          mb: 2,
        }}
      >
        <Box flex={1} display="flex" alignItems="center" justifyContent="center">
          <Typography variant="body1" color="text.secondary" textAlign="center" fontStyle="italic">
            Select a concept from the left to view details here.
          </Typography>
        </Box>
      </Paper>
    );
  }

  const currentConcept = selectedConcepts[currentIndex];
  const conceptUri = currentConcept.value;
  const properties = conceptProperties[conceptUri] ?? [];

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        mb: 2,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} sx={{
            color: 'inherit',
            borderColor: 'currentColor',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.1)',
              borderColor: 'currentColor',
            },
          }}>
        <Typography variant="h6" color="primary" fontWeight="bold">
          Concept Details : {conceptUriToName(conceptUri)}
        </Typography>
        <Chip
          size="small"
          label={`${(selectedProperties[conceptUri] ?? []).length} Selected`}
          variant="filled"
          color="secondary"
          sx={{ fontSize: '0.7rem' }}
        />
      </Box>
      <Divider sx={{ mb: 2 }} />

      <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
        <Box mb={2} display="flex" flexWrap="wrap" alignItems="center" gap={1}>
          <Typography variant="subtitle1" fontWeight="bold">
            {conceptUriToName(conceptUri)}
          </Typography>
          <Typography variant="subtitle1" fontWeight="bold">
            —
          </Typography>
          <Box
            component="a"
            href={conceptUri}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: PRIMARY_COL,
              backgroundColor: '#f8f9fa',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              border: `1px solid ${PRIMARY_COL}30`,
              wordBreak: 'break-all',
            }}
          >
            {conceptUri}
          </Box>
        </Box>

        <Box mb={2} display="flex" flexDirection="column">
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6" fontWeight="bold">
              Property Details
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                size="small"
                variant="text"
                onClick={() => onSelectAllProperties(conceptUri)}
                sx={{ fontSize: '0.7rem', minWidth: 'auto', px: 1 }}
              >
                Select All
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={() => onClearAllProperties(conceptUri)}
                sx={{ fontSize: '0.7rem', minWidth: 'auto', px: 1 }}
              >
                Clear
              </Button>
            </Box>
          </Box>
          <Divider sx={{ mb: 1 }} />

          {properties.length > 0 ? (
            <>
              <List dense>
                {properties.map((prop, idx) => {
                  const uniqueKey = `${prop.description}-${idx}`;
                  const isSelected = selectedProperties[conceptUri]?.includes(uniqueKey) ?? false;

                  return (
                    <ListItem key={uniqueKey} disablePadding>
                      <ListItemButton
                        onClick={() => onToggleProperty(conceptUri, prop.description, idx)}
                      >
                        <ListItemIcon>
                          <Checkbox
                            edge="start"
                            checked={isSelected}
                            tabIndex={-1}
                            disableRipple
                            color="primary"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={<Typography variant="body2">{prop.description}</Typography>}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>

              {(selectedProperties[conceptUri]?.length ?? 0) === 0 && (
                <Typography
                  variant="caption"
                  color="error"
                  fontStyle="italic"
                  sx={{ mt: 1, ml: 2 }}
                >
                  Please select at least 1 property to continue.
                </Typography>
              )}
            </>
          ) : (
            <Typography
              variant="caption"
              color="text.secondary"
              fontStyle="italic"
              sx={{ mt: 1, ml: 2 }}
            >
              No properties available for this concept.
            </Typography>
          )}
        </Box>
        {/* <Box mb={2} display="flex" flexDirection="column">
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6" fontWeight="bold">
              Goals
            </Typography>
            <Box>
              <Button size="small" onClick={() => onSelectAllGoals(conceptUri)} sx={{ mr: 1 }}>
                Select All
              </Button>
              <Button size="small" onClick={() => onClearAllGoals(conceptUri)}>
                Clear All
              </Button>
            </Box>
          </Box>
          <Divider sx={{ mb: 1 }} />

          {sectionGoals[conceptUri]?.length > 0 ? (
            <List disablePadding>
              {sectionGoals[conceptUri].map((goal) => (
                <GoalItem
                  key={goal.goal_uri}
                  goal={goal}
                  conceptUri={conceptUri}
                  selectedGoals={selectedGoals}
                  onToggleGoal={onToggleGoal}
                />
              ))}
            </List>
          ) : (
            <Typography
              variant="caption"
              color="text.secondary"
              fontStyle="italic"
              sx={{ mt: 1, ml: 2 }}
            >
              No goals defined for this concept.
            </Typography>
          )}
        </Box> */}
      </Box>

      <Box display="flex" justifyContent="space-between" m={2.5}>
        <Button variant="outlined" onClick={onPrevious} disabled={currentIndex === 0}>
          Previous
        </Button>
        <Typography variant="body2" color="text.secondary" alignSelf="center">
          {currentIndex + 1} / {selectedConcepts.length}
        </Typography>
        <Button
          variant="outlined"
          onClick={onNext}
          disabled={currentIndex === selectedConcepts.length - 1}
        >
          Next
        </Button>
      </Box>
    </Paper>
  );
};
