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
import { conceptUriToName } from '@stex-react/api';
import React from 'react';

interface SectionDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  sectionTitle?: string;
  selectedConcepts: { label: string; value: string }[];
}

export const SectionDetailsDialog: React.FC<SectionDetailsDialogProps> = ({
  open,
  onClose,
  sectionTitle,
  selectedConcepts,
}) => {
  console.log({ selectedConcepts });
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Typography variant="h5" fontWeight="bold">
          Section Details {sectionTitle ? `- ${sectionTitle}` : ''}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box display="grid" gridTemplateColumns="280px 1fr" gap={3} minHeight="70vh" sx={{ mt: 1 }}>
          <Paper elevation={3} sx={{ borderRadius: 2 }}>
            <Box sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', p: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Concepts ({selectedConcepts.length})
              </Typography>
            </Box>
            <Divider />
            <List dense sx={{ maxHeight: '75vh', overflow: 'auto' }}>
              {selectedConcepts.length > 0 ? (
                selectedConcepts.map((c) => (
                  <ListItem key={c.value} disablePadding>
                    <ListItemButton sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <ListItemIcon>
                        <Checkbox edge="start" tabIndex={-1} disableRipple color="primary" />
                      </ListItemIcon>
                      <Tooltip title={c.value} placement="right" arrow>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                              {conceptUriToName(c.value)}
                            </Typography>
                          }
                        />
                      </Tooltip>
                    </ListItemButton>
                  </ListItem>
                ))
              ) : (
                <Box p={3} textAlign="center">
                  <Typography color="text.secondary" variant="body2">
                    No concepts selected
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
            <Box flex={1} display="flex" alignItems="center" justifyContent="center">
              <Typography variant="body1" color="text.secondary" textAlign="center">
                Select a concept from the left to view its properties, misconceptions, or metadata
                here.
              </Typography>
            </Box>
          </Paper>
        </Box>

        <Box mt={4} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {selectedConcepts.length} concepts selected
          </Typography>
          <Box display="flex" gap={2}>
            <Button variant="outlined" onClick={onClose} size="large">
              Close
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={selectedConcepts.length === 0}
            >
              Generate
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
