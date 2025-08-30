import {
  Box,
  Checkbox,
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

interface ConceptSelectorProps {
  concepts: { label: string; value: string }[];
  selectedConcepts: { label: string; value: string }[];
  allSelected: boolean;
  someSelected: boolean;
  startSectionUri: string;
  onToggleAll: () => void;
  onSelectConcept: (concept: { label: string; value: string }) => void;
}

export const ConceptSelector: React.FC<ConceptSelectorProps> = ({
  concepts,
  selectedConcepts,
  allSelected,
  someSelected,
  startSectionUri,
  onToggleAll,
  onSelectConcept,
}) => {
  return (
    <Paper
      elevation={3}
      sx={{
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        mb: 2,
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
                  onChange={onToggleAll}
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
          concepts.map((c) => (
            <ListItem key={c.value} disablePadding>
              <ListItemButton onClick={() => onSelectConcept(c)}>
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
          ))
        ) : (
          <Box p={3} textAlign="center">
            <Typography color="text.secondary" variant="body2" fontStyle="italic">
              {startSectionUri ? 'No concepts found in range' : 'No section selected'}
            </Typography>
          </Box>
        )}
      </List>
    </Paper>
  );
};
