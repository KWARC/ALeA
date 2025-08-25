import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Tooltip,
    Typography,
} from '@mui/material';
import { conceptUriToName, getDefiniedaInSection } from '@stex-react/api';
import React, { useEffect, useState } from 'react';
import { SecInfo } from '../../types';
import { getSectionRange } from './CourseSectionSelector';

interface SectionDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  startSectionUri: string;
  endSectionUri: string;
  sections: SecInfo[];
  setLoading: (val: boolean) => void;
}

export const SectionDetailsDialog: React.FC<SectionDetailsDialogProps> = ({
  open,
  onClose,
  startSectionUri,
  endSectionUri,
  sections,
  setLoading,
}) => {
  const [concepts, setConcepts] = useState<{ label: string; value: string }[]>([]);
  const [selectedConcepts, setSelectedConcepts] = useState<{ label: string; value: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const allSelected = concepts.length > 0 && selectedConcepts.length === concepts.length;
  const someSelected = selectedConcepts.length > 0 && selectedConcepts.length < concepts.length;

  useEffect(() => {
    if (selectedConcepts.length > 0) {
      setCurrentIndex(0);
    } else {
      setCurrentIndex(-1);
    }
  }, [selectedConcepts]);
  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedConcepts([]);
    } else {
      setSelectedConcepts(concepts);
    }
  };

  useEffect(() => {
    if (!open || !startSectionUri || !endSectionUri || !sections?.length) return;

    const fetchConcepts = async () => {
      setLoading(true);
      try {
        const rangeSections = getSectionRange(startSectionUri, endSectionUri, sections);
        console.log({ rangeSections });
        const allUris: string[] = [];

        for (const sec of rangeSections) {
          const defs = await getDefiniedaInSection(sec.uri);
          allUris.push(...defs.map((c) => c.conceptUri));
        }
        console.log({ allUris });
        const uniqueUris = [...new Set(allUris)];
        setConcepts(
          uniqueUris.map((uri) => ({
            label: `${conceptUriToName(uri)} (${uri})`,
            value: uri,
          }))
        );
      } catch (err) {
        console.error('Error fetching concepts in range:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConcepts();
  }, [open, startSectionUri, endSectionUri, sections]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < selectedConcepts.length - 1 ? prev + 1 : prev));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl" scroll="paper">
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Typography variant="h5" fontWeight="bold">
          Generate
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2 }}>
        <Box display="grid" gridTemplateColumns="280px 1fr" gap={3} height="70vh">
          <Paper
            elevation={3}
            sx={{
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', p: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Concepts ({selectedConcepts.length})
              </Typography>
            </Box>
            <Divider />
            <List
              dense
              sx={{
                flex: 1,
                overflowY: 'auto',
                maxHeight: '100%',
              }}
            >
              {concepts.length > 0 && (
                <>
                  <ListItem>
                    <ListItemIcon>
                      <Checkbox
                        indeterminate={someSelected}
                        checked={allSelected}
                        onChange={handleToggleAll}
                        color="primary"
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight="bold">
                          Select All ({concepts.length})
                        </Typography>
                      }
                    />
                  </ListItem>
                  <Divider />
                </>
              )}

              {concepts.length > 0 ? (
                concepts.map((c) => {
                  const checked = selectedConcepts.some((sc) => sc.value === c.value);
                  return (
                    <ListItem key={c.value} disablePadding>
                      <ListItemButton
                        onClick={() =>
                          setSelectedConcepts((prev) =>
                            checked ? prev.filter((sc) => sc.value !== c.value) : [...prev, c]
                          )
                        }
                      >
                        <ListItemIcon>
                          <Checkbox checked={checked} color="primary" />
                        </ListItemIcon>
                        <Tooltip title={c.value} placement="right" arrow>
                          <ListItemText primary={conceptUriToName(c.value)} />
                        </Tooltip>
                      </ListItemButton>
                    </ListItem>
                  );
                })
              ) : (
                <Box p={3} textAlign="center">
                  <Typography color="text.secondary" variant="body2">
                    {startSectionUri ? 'No concepts found in range' : 'No section selected'}
                  </Typography>
                </Box>
              )}
            </List>
          </Paper>

          <Paper
            elevation={3}
            sx={{ p: 3, borderRadius: 2, display: 'flex', flexDirection: 'column' }}
          >
            <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
              Concept Details
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {selectedConcepts.length > 0 && currentIndex >= 0 ? (
              <>
                <Box flex={1}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {conceptUriToName(selectedConcepts[currentIndex].value)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedConcepts[currentIndex].value}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mt={2}>
                  <Button variant="outlined" onClick={handlePrev} disabled={currentIndex === 0}>
                    Previous
                  </Button>
                  <Typography variant="body2" color="text.secondary" alignSelf="center">
                    {currentIndex + 1} / {selectedConcepts.length}
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={handleNext}
                    disabled={currentIndex === selectedConcepts.length - 1}
                  >
                    Next
                  </Button>
                </Box>
              </>
            ) : (
              <Box flex={1} display="flex" alignItems="center" justifyContent="center">
                <Typography variant="body1" color="text.secondary" textAlign="center">
                  Select a concept from the left to view details here.
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </DialogContent>

      <Box display="flex" justifyContent="flex-end" gap={2} p={2}>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
        <Button variant="contained" color="primary" disabled={selectedConcepts.length === 0}>
          Generate
        </Button>
      </Box>
    </Dialog>
  );
};
