import { conceptUriToName } from '@alea/spec';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Chip, Divider, IconButton, Paper, Typography } from '@mui/material';
import React from 'react';
import { ConceptProperty, QuestionCategory, QuestionType } from './SectionDetailsDialog';

interface GenerationSummaryProps {
  selectedConcepts: { label: string; value: string }[];
  selectedQuestionTypes: string[];
  selectedProperties: { [conceptUri: string]: string[] };
  selectedCategories?: string[];
  conceptProperties: { [conceptUri: string]: ConceptProperty[] };
  questionTypes: QuestionType[];
  selectedGoals: { [conceptUri: string]: string[] };
  Categories: QuestionCategory[];
  onRemoveProperty: (conceptUri: string, propertyKey: string) => void;
  onRemoveGoal?: (conceptUri: string, goalUri: string) => void;
  onRemoveCategories?: (categoryId: string) => void;
}

export const GenerationSummary: React.FC<GenerationSummaryProps> = ({
  selectedConcepts,
  selectedQuestionTypes,
  selectedCategories,
  selectedProperties,
  conceptProperties,
  questionTypes,
  selectedGoals,
  Categories,
  onRemoveProperty,
  onRemoveGoal,
  onRemoveCategories,
}) => {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());

  const toggleSectionExpansion = (sectionUri: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionUri)) {
      newExpanded.delete(sectionUri);
    } else {
      newExpanded.add(sectionUri);
    }
    setExpandedSections(newExpanded);
  };
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
            Goals Summary
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            {Object.entries(selectedGoals).map(([sectionUri, selected]) => {
              const isExpanded = expandedSections.has(sectionUri);
              const displayLimit = 3;
              const shouldTruncate = selected.length > displayLimit;
              const displayedGoals =
                shouldTruncate && !isExpanded ? selected.slice(0, displayLimit) : selected;
              const remainingCount = selected.length - displayLimit;

              return (
                <Box key={sectionUri}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Chip
                      label={`${selected.length} goal${selected.length !== 1 ? 's' : ''} selected`}
                      size="small"
                      variant="outlined"
                      color={selected.length > 0 ? 'primary' : 'default'}
                    />
                  </Box>

                  {selected.length > 0 ? (
                    <Box ml={2} mb={1}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        gutterBottom
                        display="block"
                      >
                        Selected Goals:
                      </Typography>
                      <Box display="flex" flexDirection="column" gap={1}>
                        {displayedGoals.map((desc) => (
                          <Paper key={desc} elevation={1} sx={{ p: 1.5, borderRadius: 1.5 }}>
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
                                  fontWeight: 500,
                                }}
                              >
                                {desc}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => onRemoveGoal?.(sectionUri, desc)}
                                sx={{
                                  color: 'error.main',
                                  '&:hover': { bgcolor: 'error.50', color: 'error.dark' },
                                  ml: 1,
                                  flexShrink: 0,
                                }}
                              >
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Paper>
                        ))}

                        {shouldTruncate && (
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1.5,
                              borderRadius: 1.5,
                              bgcolor: 'grey.100',
                              border: '1px dashed',
                              borderColor: 'grey.300',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                bgcolor: 'grey.200',
                                borderColor: 'grey.400',
                              },
                            }}
                            onClick={() => toggleSectionExpansion(sectionUri)}
                          >
                            <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                {isExpanded
                                  ? 'Show less'
                                  : `+${remainingCount} more goal${
                                      remainingCount !== 1 ? 's' : ''
                                    }`}
                              </Typography>
                              <ExpandMoreIcon
                                fontSize="small"
                                sx={{
                                  color: 'text.secondary',
                                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s ease',
                                }}
                              />
                            </Box>
                          </Paper>
                        )}
                      </Box>
                    </Box>
                  ) : (
                    <Box ml={2}>
                      <Typography variant="caption" color="text.secondary" fontStyle="italic">
                        No goals selected for this section
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
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Selected Categories ({selectedCategories?.length})
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            {selectedCategories.map((catId) => {
              const category = Categories.find((c) => c.id === catId);

              return (
                <Paper key={catId} elevation={1} sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <Chip
                      label={category.label}
                      size="small"
                      variant="filled"
                      color="secondary"
                      sx={{ fontWeight: 500 }}
                      onDelete={() => onRemoveCategories?.(catId)}
                      deleteIcon={<CloseIcon />}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                      {category.description || 'No description available'}
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
