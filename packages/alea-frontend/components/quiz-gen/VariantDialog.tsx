import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';

export interface VariantConfig {
  variantTypes: string[];
  difficulty?: string;
  formatType?: string;
  customPrompt: string;
}

interface VariantDialogProps {
  open: boolean;
  onClose: () => void;
  variantConfig: VariantConfig;
  setVariantConfig: React.Dispatch<React.SetStateAction<VariantConfig>>;
  onCreate: () => void;
}

export const VariantDialog: React.FC<VariantDialogProps> = ({
  open,
  onClose,
  variantConfig,
  setVariantConfig,
  onCreate,
}) => {
  const toggleVariantType = (type: string) => {
    setVariantConfig((prev) => {
      const alreadySelected = prev.variantTypes.includes(type);
      return {
        ...prev,
        variantTypes: alreadySelected
          ? prev.variantTypes.filter((t) => t !== type)
          : [...prev.variantTypes, type],
      };
    });
  };

  const handleConfigChange = (field: keyof VariantConfig, value: string) => {
    setVariantConfig((prev) => ({ ...prev, [field]: value }));
  };

  const clearSelection = () => {
    setVariantConfig({
      variantTypes: [],
      difficulty: '',
      formatType: '',
      customPrompt: '',
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          pb: 1,
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'primary.main',
        }}
      >
        Create a New Variant
      </DialogTitle>

      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            mb: 3,
            p: 2,
            bgcolor: '#f8f9fa',
            borderRadius: 2,
            border: '1px solid #e0e0e0',
          }}
        >
          <Button
            variant={variantConfig.variantTypes.includes('rephrase') ? 'contained' : 'outlined'}
            onClick={() => toggleVariantType('rephrase')}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500, minWidth: 100 }}
          >
            Rephrase
          </Button>

          <Button
            variant={variantConfig.variantTypes.includes('shuffle') ? 'contained' : 'outlined'}
            onClick={() => toggleVariantType('shuffle')}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500, minWidth: 100 }}
          >
            Distractor Shuffle
          </Button>

          <Button
            variant={variantConfig.variantTypes.includes('conceptual') ? 'contained' : 'outlined'}
            onClick={() => toggleVariantType('conceptual')}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500, minWidth: 100 }}
          >
            Conceptual Twist
          </Button>
        </Box>

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mb: 1,
            p: 2,
            bgcolor: '#fafafa',
            borderRadius: 2,
          }}
        >
          <FormControl fullWidth>
            <InputLabel>Difficulty Variant</InputLabel>
            <Select
              value={variantConfig.difficulty || ''}
              onChange={(e) => {
                if (!variantConfig.variantTypes.includes('difficulty')) {
                  toggleVariantType('difficulty');
                }
                setVariantConfig((prev) => ({ ...prev, difficulty: e.target.value }));
              }}
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="easy">Easy</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="hard">Hard</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Format Shift</InputLabel>
            <Select
              value={variantConfig.formatType || ''}
              onChange={(e) => {
                if (!variantConfig.variantTypes.includes('formatShift')) {
                  toggleVariantType('formatShift');
                }
                setVariantConfig((prev) => ({ ...prev, formatType: e.target.value }));
              }}
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="mcqToFill">MCQ → Fill in the Blank</MenuItem>
              <MenuItem value="fillToMsq">Fill in the Blank → MSQ</MenuItem>
              <MenuItem value="msqToTf">MSQ → True/False</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Button
          size="small"
          onClick={clearSelection}
          sx={{ color: '#666', textTransform: 'none', mb: 2 }}
        >
          Clear Selection
        </Button>

        <TextField
          label="Pretext Instructions"
          placeholder="E.g., simplify language, add a real-world scenario, remove hints..."
          value={variantConfig.customPrompt}
          onChange={(e) => handleConfigChange('customPrompt', e.target.value)}
          fullWidth
          multiline
          minRows={3}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': { borderRadius: 2 },
          }}
        />

        <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2, border: '1px solid #bbdefb' }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Selected Configuration:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Variants:</strong> {variantConfig.variantTypes.join(', ') || 'None'}
            {variantConfig.variantTypes.includes('difficulty') &&
              ` | Difficulty: ${variantConfig.difficulty}`}
            {variantConfig.variantTypes.includes('formatShift') &&
              ` | Format: ${variantConfig.formatType}`}
            {variantConfig.customPrompt && ` | Extra: "${variantConfig.customPrompt}"`}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onCreate}
          sx={{ textTransform: 'none', borderRadius: 2, px: 3 }}
        >
          Create Variant
        </Button>
      </DialogActions>
    </Dialog>
  );
};
