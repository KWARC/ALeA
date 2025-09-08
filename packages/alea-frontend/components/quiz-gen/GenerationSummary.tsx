import CloseIcon from '@mui/icons-material/Close';
import { Box, Chip, Divider, IconButton, Paper, Typography } from '@mui/material';
import { conceptUriToName } from '@stex-react/api';
import React from 'react';
import { ConceptProperty, QuestionType, SectionGoals } from './SectionDetailsDialog';

interface GenerationSummaryProps {
  selectedConcepts: { label: string; value: string }[];
  selectedQuestionTypes: string[];
  selectedProperties: { [conceptUri: string]: string[] };
  conceptProperties: { [conceptUri: string]: ConceptProperty[] };
  questionTypes: QuestionType[];
  sectionGoals: SectionGoals;
  selectedGoals: { [conceptUri: string]: string[] };
  onRemoveProperty: (conceptUri: string, propertyKey: string) => void;
  onRemoveGoal?: (conceptUri: string, goalUri: string) => void;
}
export const GenerationSummary: React.FC<GenerationSummaryProps> = ({
  selectedConcepts,
  selectedQuestionTypes,
  selectedProperties,
  conceptProperties,
  questionTypes,
  sectionGoals,
  selectedGoals,
  onRemoveProperty,
  onRemoveGoal,
}) => {
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
      <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
        Generation Summary
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <Box mb={3}>
          <Typography variant="h6" fontWeight="600" gutterBottom>
            Selected Concepts ({selectedConcepts.length})
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {selectedConcepts.map((concept) => (
              <Chip
                key={concept.value}
                label={conceptUriToName(concept.value)}
                size="small"
                variant="outlined"
                color="primary"
              />
            ))}
          </Box>
        </Box>

        <Box mb={3}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Selected Question Types ({selectedQuestionTypes.length})
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            {selectedQuestionTypes.map((typeId) => {
              const questionType = questionTypes.find((qt) => qt.id === typeId);
              return (
                <Paper
                  key={typeId}
                  elevation={1}
                  sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}
                >
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <Chip
                      label={questionType?.label}
                      size="small"
                      variant="filled"
                      color="secondary"
                      sx={{ fontWeight: 500 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                      {questionType?.description}
                    </Typography>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Box>

        <Box mb={3}>
          <Typography variant="h6" fontWeight="600" gutterBottom>
            Properties Summary
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            {selectedConcepts.map((concept) => {
              const selectedProps = selectedProperties[concept.value] ?? [];
              const allProps = conceptProperties[concept.value] ?? [];
              return (
                <Box key={concept.value}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="subtitle1" fontWeight="600" color="primary">
                      {conceptUriToName(concept.value)}
                    </Typography>
                    <Chip
                      label={`${selectedProps.length}/${allProps.length} selected`}
                      size="small"
                      variant="outlined"
                      color={selectedProps.length > 0 ? 'primary' : 'default'}
                    />
                  </Box>

                  {selectedProps.length > 0 && (
                    <Box ml={2} mb={1}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        gutterBottom
                        display="block"
                      >
                        Selected Properties:
                      </Typography>
                      <Box display="flex" flexDirection="column" gap={1}>
                        {selectedProps.map((uniqueKey) => {
                          const [propKey] = uniqueKey.split('-');
                          const property = allProps.find((p) => p.prop === propKey);
                          return (
                            <Paper
                              key={uniqueKey}
                              elevation={1}
                              sx={{
                                p: 1.5,
                                borderRadius: 1.5,
                                bgcolor: 'primary.50',
                                border: '1px solid',
                                borderColor: 'primary.200',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  bgcolor: 'primary.100',
                                  boxShadow: 2,
                                },
                              }}
                            >
                              <Box
                                display="flex"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                gap={2}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    flex: 1,
                                    lineHeight: 1.4,
                                    color: 'text.primary',
                                  }}
                                >
                                  {property?.description || propKey}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => onRemoveProperty(concept.value, uniqueKey)}
                                  sx={{
                                    color: 'error.main',
                                    '&:hover': {
                                      bgcolor: 'error.50',
                                      color: 'error.dark',
                                    },
                                    ml: 1,
                                    flexShrink: 0,
                                  }}
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Paper>
                          );
                        })}
                      </Box>
                    </Box>
                  )}

                  {selectedProps.length === 0 && (
                    <Box ml={2}>
                      <Typography variant="caption" color="text.secondary" fontStyle="italic">
                        No properties selected for this concept
                      </Typography>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box mb={3}>
          <Typography variant="h6" fontWeight="600" gutterBottom>
            Goals Summary
          </Typography>
          {Object.entries(selectedGoals).map(([sectionUri, selected]) => {
            const allGoals = sectionGoals[sectionUri] ?? [];
            return (
              <Box key={sectionUri} mb={2}>
                <Typography variant="subtitle2" color="primary">
                  {sectionUri}
                </Typography>
                {selected.length > 0 ? (
                  <Box display="flex" flexDirection="column" gap={1}>
                    {selected.map((goalUri) => {
                      const goal = allGoals.find((g) => g.goal_uri === goalUri);
                      return (
                        <Chip
                          key={goalUri}
                          label={goal?.description || goalUri}
                          onDelete={() => onRemoveGoal?.(sectionUri, goalUri)}
                        />
                      );
                    })}
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary" fontStyle="italic">
                    No goals selected for this section
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>

        <Box>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Total Properties Selected
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {Object.values(selectedProperties).flat().length} properties across all concepts
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};
