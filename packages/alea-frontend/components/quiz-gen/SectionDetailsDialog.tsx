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

interface SectionDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  section: SecInfo | null;
  setLoading: (val: boolean) => void;
}

export const SectionDetailsDialog: React.FC<SectionDetailsDialogProps> = ({
  open,
  onClose,
  section,
  setLoading,
}) => {
  const [concepts, setConcepts] = useState<{ label: string; value: string }[]>([]);
  const [selectedConcepts, setSelectedConcepts] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    if (!open || !section?.uri) return;
    const fetchConcepts = async () => {
      setLoading(true);
      try {
        const result = await getDefiniedaInSection(section.uri);
        const uniqueUris = [...new Set(result.map((c) => c.conceptUri))];
        setConcepts(
          uniqueUris.map((uri) => ({
            label: `${conceptUriToName(uri)} (${uri})`,
            value: uri,
          }))
        );
      } catch (err) {
        console.error('Error fetching concepts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConcepts();
  }, [open, section]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl" scroll="paper">
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Typography variant="h5" fontWeight="bold">
          Generate from Section: {section?.title}
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
                    {section ? 'No concepts found' : 'No section selected'}
                  </Typography>
                </Box>
              )}
            </List>
          </Paper>

          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
              Concept Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {selectedConcepts.length > 0 ? (
              <Typography>Details for {selectedConcepts[0].label}</Typography>
            ) : (
              <Typography color="text.secondary">
                Select a concept from the left to view details here.
              </Typography>
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
