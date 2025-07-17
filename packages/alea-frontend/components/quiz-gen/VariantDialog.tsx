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
  rephraseInstruction?: string;
  shuffleInstruction?: string;
  conceptualInstruction?: string;
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
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500, mb: 1 }}
          >
            Rephrase Variant
          </Button>
          {variantConfig.variantTypes.includes('rephrase') && (
            <TextField
              label="Rephrase Instructions"
              placeholder="e.g., simplify language, keep same meaning"
              value={variantConfig.rephraseInstruction || ''}
              onChange={(e) =>
                setVariantConfig((prev) => ({ ...prev, rephraseInstruction: e.target.value }))
              }
              fullWidth
              multiline
              minRows={2}
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: '#f8f9fa',
            borderRadius: 2,
            border: '1px solid #e0e0e0',
          }}
        >
          <Button
            variant={variantConfig.variantTypes.includes('shuffle') ? 'contained' : 'outlined'}
            onClick={() => toggleVariantType('shuffle')}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500, mb: 1 }}
          >
            Distractor Shuffle
          </Button>
          {variantConfig.variantTypes.includes('shuffle') && (
            <TextField
              label="Distractor Shuffle Instructions"
              placeholder="e.g., randomize but keep correct answer intact"
              value={variantConfig.shuffleInstruction || ''}
              onChange={(e) =>
                setVariantConfig((prev) => ({ ...prev, shuffleInstruction: e.target.value }))
              }
              fullWidth
              multiline
              minRows={2}
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: '#f8f9fa',
            borderRadius: 2,
            border: '1px solid #e0e0e0',
          }}
        >
          <Button
            variant={variantConfig.variantTypes.includes('conceptual') ? 'contained' : 'outlined'}
            onClick={() => toggleVariantType('conceptual')}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500, mb: 1 }}
          >
            Conceptual Twist
          </Button>
          {variantConfig.variantTypes.includes('conceptual') && (
            <TextField
              label="Conceptual Twist Instructions"
              placeholder="e.g., apply concept in a real-world scenario"
              value={variantConfig.conceptualInstruction || ''}
              onChange={(e) =>
                setVariantConfig((prev) => ({ ...prev, conceptualInstruction: e.target.value }))
              }
              fullWidth
              multiline
              minRows={2}
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 1, p: 2, bgcolor: '#fafafa', borderRadius: 2 }}>
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
              <MenuItem value="none">None</MenuItem>
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
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="scq">SCQ</MenuItem>
              <MenuItem value="msq">MCQ</MenuItem>
              <MenuItem value="fillBlanks">Fill in the blanks</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* ✅ Clear Selection */}
        <Button
          size="small"
          onClick={clearSelection}
          sx={{ color: '#666', textTransform: 'none', mb: 2 }}
        >
          Clear Selection
        </Button>

        {/* ✅ General Pretext */}
        <TextField
          label="Pretext Instructions (optional)"
          placeholder="e.g., general notes for all variants"
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
