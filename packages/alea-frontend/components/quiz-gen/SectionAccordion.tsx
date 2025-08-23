import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  ListItemText,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { conceptUriToName, getDefiniedaInSection } from '@stex-react/api';
import React, { useEffect, useState } from 'react';
import { SecInfo } from '../../types';
import { SectionDetailsDialog } from './SectionDetailsDialog';

interface SectionAccordionProps {
  sections: SecInfo[];
  setLoading: (val: boolean) => void;
  selectedSection?: SecInfo | null; 
}

export const SectionAccordion: React.FC<SectionAccordionProps> = ({
  sections,
  setLoading,
  selectedSection,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [concepts, setConcepts] = useState<{ label: string; value: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedConcepts, setSelectedConcepts] = useState<{ label: string; value: string }[]>([]);

  const selectAllKey = 'Select All';

  useEffect(() => {
    const fetchConcepts = async () => {
      if (!selectedSection) {
        setConcepts([]);
        setSelectedConcepts([]);
        return;
      }
      setLoading(true);
      try {
        const result = await getDefiniedaInSection(selectedSection.uri);
        const uniqueUris = [...new Set(result.map((c) => c.conceptUri))];
        setConcepts(
          uniqueUris.map((uri) => ({
            label: `${conceptUriToName(uri)} (${uri})`,
            value: uri,
          }))
        );
        setSelectedConcepts([]);
      } catch (err) {
        console.error('Error fetching concepts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConcepts();
  }, [selectedSection, setLoading]);

  const handleConceptChange = (_: any, newValue: { label: string; value: string }[]) => {
    if (newValue.some((item) => item.value === selectAllKey)) {
      const allConcepts = concepts.filter((item) => item.value !== selectAllKey);
      setSelectedConcepts(newValue.length === concepts.length + 1 ? [] : allConcepts);
    } else {
      setSelectedConcepts(newValue);
    }
  };

  const getLabel = (option: { label: string; value: string }) =>
    option.value === selectAllKey ? `${selectAllKey} (${concepts.length})` : option.label;

  return (
    <Box>
      <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ mt: 2 }}>
          <Typography fontWeight="bold">
            {selectedSection ? `Section: ${selectedSection.title}` : 'Choose Section & Concepts'}
          </Typography>
        </AccordionSummary>

        <AccordionDetails>
          <Box display="flex" flexDirection="column" gap={2}>
            {selectedSection && (
              <>
                {concepts.length === 0 ? (
                  <Box display="flex" alignItems="center" justifyContent="center" gap={2} py={4}>
                    <CircularProgress size={24} />
                    <Typography variant="body1">Loading concepts...</Typography>
                  </Box>
                ) : (
                  <Autocomplete
                    multiple
                    fullWidth
                    disableCloseOnSelect
                    limitTags={2}
                    options={
                      concepts.length > 0
                        ? [{ label: selectAllKey, value: selectAllKey }, ...concepts]
                        : []
                    }
                    getOptionLabel={getLabel}
                    value={selectedConcepts}
                    onChange={handleConceptChange}
                    renderOption={(props, option, { selected }) => (
                      <li {...props} style={{ display: 'flex', alignItems: 'center' }}>
                        <Checkbox
                          checked={
                            option.value === selectAllKey
                              ? selectedConcepts.length === concepts.length
                              : selected
                          }
                          style={{ marginRight: 8 }}
                        />
                        <ListItemText
                          primary={
                            <Tooltip title={option.label}>
                              <span style={{ overflowWrap: 'anywhere' }}>{option.label}</span>
                            </Tooltip>
                          }
                        />
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Choose Concepts"
                        variant="outlined"
                        helperText={`${concepts.length} concepts available`}
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          label={conceptUriToName(option.value)}
                          {...getTagProps({ index })}
                          key={index}
                          color="primary"
                        />
                      ))
                    }
                  />
                )}
              </>
            )}
          </Box>

          {selectedConcepts.length > 0 && (
            <Paper elevation={2} sx={{ mt: 3, p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle1" fontWeight="bold" mb={2} color="primary">
                Selected Concepts ({selectedConcepts.length})
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {selectedConcepts.map((c) => (
                  <Chip
                    key={c.value}
                    label={conceptUriToName(c.value)}
                    color="primary"
                    variant="filled"
                    size="small"
                  />
                ))}
              </Box>
            </Paper>
          )}
          <Box mt={3} display="flex" justifyContent="right">
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={selectedConcepts.length === 0}
              onClick={() => setDialogOpen(true)}
              sx={{ minWidth: 150 }}
            >
              View Details
            </Button>
          </Box>

          <SectionDetailsDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            sectionTitle={selectedSection?.title}
            selectedConcepts={selectedConcepts}
          />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
