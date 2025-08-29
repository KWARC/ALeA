import {
  Box,
  Button,
  Checkbox,
  Chip,
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
import { conceptUriToName, getConceptPropertyInSection, getDefiniedaInSection, runGraphDbUpdateQuery } from '@stex-react/api';
import React, { useEffect, useState } from 'react';
import { SecInfo } from '../../types';
import { getSectionRange } from './CourseSectionSelector';
import { PRIMARY_COL } from '@stex-react/utils';

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
        const properties=await getConceptPropertyInSection(sec.uri);
        console.log({properties});
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Typography variant="h5" fontWeight="bold">
          Generate
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2, overflow: 'hidden' }}>
        <Box display="grid" gridTemplateColumns="180px 280px 1fr" gap={3} height="75vh">
          <Paper
            elevation={3}
            sx={{
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
              {selectedConcepts.length > 0 ? (
                <Box display="flex" flexDirection="column" gap={2}>
                  {selectedConcepts.map((sc, idx) => (
                    <Paper
                      key={sc.value}
                      elevation={currentIndex === idx ? 3 : 1}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        border: currentIndex === idx ? `2px solid` : '1px solid',
                        borderColor: currentIndex === idx ? 'primary.main' : 'grey.300',
                        bgcolor: currentIndex === idx ? 'primary.light' : 'background.paper',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          elevation: 2,
                          bgcolor: currentIndex === idx ? 'primary.light' : 'grey.50',
                        },
                      }}
                      onClick={() => setCurrentIndex(idx)}
                    >
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        mb={1}
                      >
                        <Typography
                          variant="subtitle2"
                          fontWeight="bold"
                          color={currentIndex === idx ? 'primary.contrastText' : 'text.primary'}
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '180px',
                          }}
                        >
                          {conceptUriToName(sc.value)}
                        </Typography>
                        <Button
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedConcepts((prev) => prev.filter((c) => c.value !== sc.value));
                          }}
                          sx={{
                            minWidth: 'auto',
                            p: 0.5,
                            color: currentIndex === idx ? 'primary.contrastText' : 'text.secondary',
                          }}
                        >
                          ×
                        </Button>
                      </Box>

                      <Typography
                        variant="caption"
                        color={currentIndex === idx ? 'primary.contrastText' : 'text.secondary'}
                        sx={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '0.7rem',
                        }}
                      >
                        {sc.value}
                      </Typography>

                      <Box mt={1} display="flex" flex-wrap gap={0.5}>
                        <Chip
                          size="small"
                          label="3 Properties"
                          variant="outlined"
                          sx={{
                            height: '20px',
                            fontSize: '0.65rem',
                            color: currentIndex === idx ? 'primary.contrastText' : 'text.secondary',
                            borderColor: currentIndex === idx ? 'primary.contrastText' : 'grey.400',
                          }}
                        />
                        <Chip
                          size="small"
                          label="2 Misconceptions"
                          variant="outlined"
                          sx={{
                            height: '20px',
                            fontSize: '0.65rem',
                            color: currentIndex === idx ? 'primary.contrastText' : 'text.secondary',
                            borderColor: currentIndex === idx ? 'primary.contrastText' : 'grey.400',
                          }}
                        />
                      </Box>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Box p={3} textAlign="center">
                    {/* <Typography color="text.secondary" variant="body2" fontStyle="italic">
                    {startSectionUri} - {endSectionUri}
                  </Typography> */}
                  <Typography color="text.secondary" variant="body2" fontStyle="italic">
                    No concepts selected
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
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
                Available Concepts ({selectedConcepts.length})
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
                  return (
                    <ListItem key={c.value} disablePadding>
                      <ListItemButton
                        onClick={() => {
                          setSelectedConcepts((prev) => {
                            const exists = prev.some((sc) => sc.value === c.value);
                            if (exists) {
                              const idx = prev.findIndex((sc) => sc.value === c.value);
                              if (idx >= 0) setCurrentIndex(idx);
                              return prev;
                            } else {
                              const newConcepts = [...prev, c];
                              setCurrentIndex(newConcepts.length - 1);
                              return newConcepts;
                            }
                          });
                        }}
                      >
                        <ListItemIcon>
                          <Checkbox
                            checked={selectedConcepts.some((sc) => sc.value === c.value)}
                            color="primary"
                          />
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
                  <Typography color="text.secondary" variant="body2" fontStyle="italic">
                    {startSectionUri ? 'No concepts found in range' : 'No section selected'}
                  </Typography>
                </Box>
              )}
            </List>
          </Paper>

          <Paper
            elevation={3}
            sx={{
              p: 3,
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              minHeight: '70vh',
            }}
          >
            {/* <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
              Concept Details
            </Typography>
            <Divider sx={{ mb: 2 }} /> */}

            {selectedConcepts.length > 0 && currentIndex >= 0 ? (
              <>
                <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
                  Concept Details : {conceptUriToName(selectedConcepts[currentIndex].value)}
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
                  <Box mb={2} display="flex" flexWrap="wrap" alignItems="center" gap={1}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {conceptUriToName(selectedConcepts[currentIndex].value)}
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="bold">
                      –
                    </Typography>
                    <Box
                      component="a"
                      href={selectedConcepts[currentIndex].value}
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
                      {selectedConcepts[currentIndex].value}
                    </Box>
                  </Box>

                  <Box mb={2} display="flex" flexDirection="column">
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Property Details
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    <List dense>
                      {['Has Primary Key', 'Is Derived', 'Used in ER Model'].map((prop, idx) => (
                        <ListItem key={idx} disablePadding>
                          <ListItemButton>
                            <ListItemIcon>
                              <Checkbox edge="start" tabIndex={-1} disableRipple color="primary" />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                  {prop}
                                </Typography>
                              }
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Box>

                  <Box mb={2} display="flex" flexDirection="column">
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Misconceptions
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    <List dense>
                      {['Confused with foreign key', 'Misapplied in normalization'].map(
                        (mis, idx) => (
                          <ListItem key={idx} disablePadding>
                            <ListItemButton>
                              <ListItemIcon>
                                <Checkbox
                                  edge="start"
                                  tabIndex={-1}
                                  disableRipple
                                  color="primary"
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                    {mis}
                                  </Typography>
                                }
                              />
                            </ListItemButton>
                          </ListItem>
                        )
                      )}
                    </List>
                  </Box>
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
                <Typography
                  variant="body1"
                  color="text.secondary"
                  textAlign="center"
                  fontStyle="italic"
                >
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
