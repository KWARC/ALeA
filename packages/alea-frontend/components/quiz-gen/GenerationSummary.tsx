import { Box, Chip, Divider, Paper, Typography } from '@mui/material';
import { conceptUriToName } from '@stex-react/api';
import React from 'react';

interface QuestionType {
  id: string;
  label: string;
  description: string;
}

interface GenerationSummaryProps {
  selectedConcepts: { label: string; value: string }[];
  selectedQuestionTypes: string[];
  selectedProperties: { [conceptUri: string]: string[] };
  questionTypes: QuestionType[];
}

export const GenerationSummary: React.FC<GenerationSummaryProps> = ({
  selectedConcepts,
  selectedQuestionTypes,
  selectedProperties,
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
          <Box display="flex" flexDirection="column" gap={1}>
            {selectedConcepts.map((concept) => {
              const propertiesCount = (selectedProperties[concept.value] ?? []).length;
              return (
                <Box
                  key={concept.value}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2">{conceptUriToName(concept.value)}</Typography>
                  <Chip
                    label={`${propertiesCount} properties`}
                    size="small"
                    variant="outlined"
                    color={propertiesCount > 0 ? 'primary' : 'default'}
                  />
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
