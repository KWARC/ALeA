import {
  Box,
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';

export const RightSidebar = ({
  maxLevel,
  selectedLevels,
  setSelectedLevels,
  direction,
  setDirection,
}: {
  maxLevel: number;
  selectedLevels: string[];
  setSelectedLevels: (levels: string[]) => void;
  direction: 'BT' | 'LR';
  setDirection: (dir: 'BT' | 'LR') => void;
}) => {
  return (
    <Box
      flex={0.4}
      border="1px solid #ddd"
      borderRadius={2}
      p={2}
      bgcolor="#fafafa"
      display="flex"
      flexDirection="column"
      gap={3}
    >
      <Typography variant="h6">Filters</Typography>

      <FormControl fullWidth>
        <InputLabel>Level</InputLabel>
        <Select
          multiple
          value={selectedLevels}
          onChange={(e) =>
            setSelectedLevels(
              typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value
            )
          }
          renderValue={(selected) =>
            (selected as string[]).includes('All')
              ? 'All Levels'
              : (selected as string[]).join(', ')
          }
        >
          <MenuItem value="All">
            <Checkbox checked={selectedLevels.includes('All')} />
            <ListItemText primary="All Levels" />
          </MenuItem>
          {Array.from({ length: maxLevel }, (_, i) => (
            <MenuItem key={i + 1} value={(i + 1).toString()}>
              <Checkbox checked={selectedLevels.includes((i + 1).toString())} />
              <ListItemText primary={`Level ${i + 1}`} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel>Direction</InputLabel>
        <Select value={direction} onChange={(e) => setDirection(e.target.value as 'BT' | 'LR')}>
          <MenuItem value="BT">Bottom → Top</MenuItem>
          <MenuItem value="LR">Left → Right</MenuItem>
        </Select>
      </FormControl>

      <Typography variant="body2" color="text.secondary">
        💡 Right-click a node to edit. Right-click empty space to add new node.
      </Typography>
    </Box>
  );
};
