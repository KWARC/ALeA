import {
  Box,
  Button,
  Checkbox,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { FlatQuizProblem } from '../../pages/quiz-gen';
import { useEffect, useState } from 'react';

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
  problemData?: FlatQuizProblem;
}

export const VariantDialog = ({
  open,
  onClose,
  variantConfig,
  setVariantConfig,
  onCreate,
  problemData,
}: VariantDialogProps) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

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

  const handleConfigChange = (field, value) => {
    setVariantConfig((prev) => ({ ...prev, [field]: value }));
  };

  const clearSelection = () => {
    setVariantConfig({
      variantTypes: [],
      difficulty: '',
      formatType: '',
      customPrompt: '',
      rephraseInstruction: '',
      shuffleInstruction: '',
      conceptualInstruction: '',
    });
  };
  let problemId: number | undefined;
  let mcqOptions: string[] = [];

  if (problemData) {
    problemId = problemData?.problemId;
    mcqOptions = problemData?.options || [];
  }

  useEffect(() => {
    if (variantConfig.variantTypes.includes('shuffle')) {
      setSelectedOptions(mcqOptions);
    }
  }, [variantConfig.variantTypes]);

  const renderSwitchToggle = (title, typeKey, instructionKey, placeholder, optionsList = []) => {
    const isActive = variantConfig.variantTypes.includes(typeKey);

    const handleSwitchChange = (checked: boolean) => {
      setVariantConfig((prev) => {
        let newTypes = [...prev.variantTypes];

        if (checked) {
          if (!newTypes.includes(typeKey)) newTypes.push(typeKey);

          if (typeKey === 'shuffle') newTypes = newTypes.filter((t) => t !== 'conceptual');
          if (typeKey === 'conceptual') newTypes = newTypes.filter((t) => t !== 'shuffle');
        } else {
          newTypes = newTypes.filter((t) => t !== typeKey);
        }

        return { ...prev, variantTypes: newTypes };
      });
    };

    return (
      <>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography sx={{ fontWeight: 500 }}>{title}</Typography>
          <Switch
            checked={isActive}
            onChange={(e) => handleSwitchChange(e.target.checked)}
            color="primary"
          />
        </Box>

        <Collapse in={isActive}>
          <TextField
            sx={{ mb: optionsList.length ? 2 : 3 }}
            label={`${title} Instructions`}
            placeholder={placeholder}
            value={variantConfig[instructionKey] || ''}
            onChange={(e) =>
              setVariantConfig((prev) => ({
                ...prev,
                [instructionKey]: e.target.value,
              }))
            }
            fullWidth
            multiline
            minRows={2}
          />

          {optionsList.length > 0 && (
            <Box sx={{ pl: 1, mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Select which options to include:
              </Typography>
              {optionsList.map((opt, idx) => {
                const checked = selectedOptions.includes(opt);
                return (
                  <FormControlLabel
                    key={idx}
                    control={
                      <Checkbox
                        checked={checked}
                        onChange={(e) => {
                          setSelectedOptions(
                            (prev) =>
                              e.target.checked
                                ? [...prev, opt] // add if checked
                                : prev.filter((o) => o !== opt) // remove if unchecked
                          );
                        }}
                      />
                    }
                    label={`${idx + 1}. ${opt}`}
                  />
                );
              })}
            </Box>
          )}
        </Collapse>
      </>
    );
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
        {renderSwitchToggle(
          'Rephrase Variant',
          'rephrase',
          'rephraseInstruction',
          'e.g., simplify language, keep same meaning'
        )}

        {renderSwitchToggle(
          'Distractor Shuffle',
          'shuffle',
          'shuffleInstruction',
          'e.g., randomize but keep correct answer intact',
          mcqOptions
        )}

        {renderSwitchToggle(
          'Recontextualize Problem',
          'conceptual',
          'conceptualInstruction',
          'e.g., apply concept in a real-world scenario'
        )}

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
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="scq">SCQ</MenuItem>
              <MenuItem value="msq">MCQ</MenuItem>
              <MenuItem value="fillBlanks">Fill in the blanks</MenuItem>
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
