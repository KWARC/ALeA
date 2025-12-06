import { Box, Button, Chip, Paper, Tooltip, Typography } from '@mui/material';
import { conceptUriToName } from '@alea/spec';
import React from 'react';
import { ConceptProperty } from './SectionDetailsDialog';

interface SelectedConceptProps {
  concept: { label: string; value: string };
  index: number;
  currentIndex: number;
  conceptProperties: { [conceptUri: string]: ConceptProperty[] };
  selectedProperties: { [conceptUri: string]: string[] };
  onSelect: (index: number) => void;
  onRemove: (conceptValue: string) => void;
}

export const SelectedConcept: React.FC<SelectedConceptProps> = ({
  concept,
  index,
  currentIndex,
  conceptProperties,
  selectedProperties,
  onSelect,
  onRemove,
}) => {
  const isActive = currentIndex === index;
  const totalProps = (conceptProperties[concept.value] ?? []).length;
  const selectedProps = (selectedProperties[concept.value] ?? []).length;
  const showSelected = selectedProps > 0 || isActive;

  return (
    <Paper
      elevation={isActive ? 3 : 1}
      sx={{
        p: 2,
        cursor: 'pointer',
        border: isActive ? `2px solid` : '1px solid',
        borderColor: isActive ? 'primary.main' : 'grey.300',
        bgcolor: isActive ? 'primary.light' : 'background.paper',
        transition: 'all 0.2s ease',
        '&:hover': {
          elevation: 2,
          bgcolor: isActive ? 'primary.light' : 'grey.50',
        },
        '&:hover .property-chip': {
          transform: 'scale(1.05)',
        },
      }}
      onClick={() => onSelect(index)}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Typography
          variant="subtitle2"
          fontWeight="bold"
          color={isActive ? 'primary.contrastText' : 'text.primary'}
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '180px',
          }}
        >
          {conceptUriToName(concept.value)}
        </Typography>
        <Button
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(concept.value);
          }}
          sx={{
            minWidth: 'auto',
            p: 0.5,
            color: isActive ? 'primary.contrastText' : 'text.secondary',
          }}
        >
          ×
        </Button>
      </Box>

      <Typography
        variant="caption"
        color={isActive ? 'primary.contrastText' : 'text.secondary'}
        sx={{
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: '0.7rem',
        }}
      >
        {concept.value}
      </Typography>

      <Box mt={1} display="flex" flexWrap="wrap" gap={0.5}>
        <Tooltip
          title={`${selectedProps} selected / ${totalProps} total properties`}
          placement="top"
          arrow
        >
          <Chip
            className="property-chip"
            size="small"
            label={
              showSelected
                ? `${selectedProps}/${totalProps} Properties`
                : `${totalProps} Properties`
            }
            variant={selectedProps > 0 ? 'filled' : 'outlined'}
            color={selectedProps > 0 ? 'primary' : 'default'}
            sx={{
              height: '20px',
              fontSize: '0.65rem',
              color: isActive
                ? 'primary.contrastText'
                : selectedProps > 0
                ? 'primary.contrastText'
                : 'text.secondary',
              borderColor: isActive ? 'primary.contrastText' : 'grey.400',
              bgcolor: selectedProps > 0 && !isActive ? 'primary.main' : undefined,
              transition: 'all 0.2s ease',
            }}
          />
        </Tooltip>
      </Box>
    </Paper>
  );
};
