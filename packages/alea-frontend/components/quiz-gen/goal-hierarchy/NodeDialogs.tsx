import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

export const CreateNodeDialog = ({
  open,
  initialLabel = '',
  initialLevel = 1,
  onClose,
  onCreate,
}: {
  open: boolean;
  initialLabel?: string;
  initialLevel?: number;
  onClose: () => void;
  onCreate: (label: string, level: number) => void;
}) => {
  const [label, setLabel] = useState(initialLabel);
  const [level, setLevel] = useState(initialLevel);

  useEffect(() => {
    setLabel(initialLabel);
    setLevel(initialLevel);
  }, [initialLabel, initialLevel, open]);

  const handleCreate = () => {
    if (label.trim() === '' || level < 1) return;
    console.log({ label });
    onCreate(label, level);
    setLabel('');
    setLevel(initialLevel);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Create New Goal</DialogTitle>
      <DialogContent>
        <Box mt={2} display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Goal Title"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            fullWidth
          />
          <TextField
            label="Level"
            type="number"
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleCreate}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const EditNodeDialog = ({
  open,
  nodeId,
  nodeLabel,
  onClose,
  onSave,
}: {
  open: boolean;
  nodeId?: string;
  nodeLabel?: string;
  onClose: () => void;
  onSave: (newLabel: string) => void;
}) => {
  const [label, setLabel] = useState(nodeLabel || '');

  useEffect(() => {
    setLabel(nodeLabel || '');
  }, [nodeLabel]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSave(label);
    }
  };

  const handleSave = () => {
    onSave(label);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit Node</DialogTitle>
      <DialogContent>
        {nodeId && (
          <Box mt={2}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Node ID: {nodeId}
            </Typography>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '1rem',
                borderRadius: 6,
                border: '1px solid #ccc',
              }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
