import { Box, Chip, Divider, Paper, Typography } from '@mui/material';
import { conceptUriToName } from '@stex-react/api';
import React from 'react';
import { ConceptProperty, QuestionType } from './SectionDetailsDialog';

interface GenerationSummaryProps {
  selectedConcepts: { label: string; value: string }[];
  selectedQuestionTypes: string[];
  selectedProperties: { [conceptUri: string]: string[] };
  conceptProperties: { [conceptUri: string]: ConceptProperty[] };
  questionTypes: QuestionType[];
}

export const GenerationSummary: React.FC<GenerationSummaryProps> = ({
  selectedConcepts,
  selectedQuestionTypes,
  selectedProperties,
  conceptProperties,
  questionTypes,
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
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
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
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Selected Question Types ({selectedQuestionTypes.length})
          </Typography>
          <Box display="flex" flexDirection="column" gap={1}>
            {selectedQuestionTypes.map((typeId) => {
              const questionType = questionTypes.find((qt) => qt.id === typeId);
              return (
                <Box key={typeId} display="flex" alignItems="center" gap={2}>
                  <Chip
                    label={questionType?.label}
                    size="small"
                    variant="filled"
                    color="secondary"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {questionType?.description}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box mb={3}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Properties Summary
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            {selectedConcepts.map((concept) => {
              const selectedProps = selectedProperties[concept.value] ?? [];
              const allProps = conceptProperties[concept.value] ?? [];

              return (
                <Box key={concept.value}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" fontWeight="bold">
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
                      <Box display="flex" flexDirection="column" gap={0.5}>
                        {selectedProps.map((propKey) => {
                          const property = allProps.find((p) => p.prop === propKey);
                          return (
                            <Box key={propKey} display="flex" alignItems="flex-start" gap={1}>
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 'bold', minWidth: '4px' }}
                              >
                                •
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.primary"
                                sx={{ flexGrow: 1 }}
                              >
                                {property?.description || propKey}
                              </Typography>
                            </Box>
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

        <Box>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Total Properties Selected
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {Object.values(selectedProperties).flat().length} properties across all concepts
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};
