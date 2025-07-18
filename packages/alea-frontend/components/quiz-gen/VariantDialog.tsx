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
    Radio,
    RadioGroup,
    Select,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { FlatQuizProblem } from '../../pages/quiz-gen';

export interface VariantConfig {
  variantTypes: string[];
  difficulty?: string;
  formatType?: string;
  customPrompt: string;

  rephraseInstruction?: string;
  rephraseSubtypes?: string[];

  modifyChoiceMode?: 'add' | 'remove';
  modifyChoiceInstruction?: string;

  conceptualInstruction?: string;
}

interface VariantDialogProps {
  open: boolean;
  onClose: () => void;
  variantConfig: VariantConfig;
  setVariantConfig: React.Dispatch<React.SetStateAction<VariantConfig>>;
  onCreate: (payload: {
    variantTypes: string[];
    difficulty?: string;
    formatType?: string;
    customPrompt?: string;
    rephraseInstruction?: string;
    modifyChoiceInstruction?: string;
    conceptualInstruction?: string;
    shuffleProblemId?: number;
    selectedOptions?: string[];
  }) => void;
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
      modifyChoiceInstruction: '',
      conceptualInstruction: '',
    });
  };
  const REPHRASE_SUBOPTIONS = [
    'Technical Rephrasing',
    'Entity Swapping',
    'Numerical Substitution',
    'Add/Remove Distractors',
  ];

  const MODIFY_CHOICES_OPTIONS = ['add', 'remove'];

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

  const handleCreateAndReturn = () => {
    const selectedTypes = variantConfig.variantTypes;

    const payload: any = {
      ...variantConfig,
    };

    if (selectedTypes.includes('shuffle') && problemId) {
      payload.shuffleProblemId = problemId;
      payload.selectedOptions = selectedOptions;
    }

    onCreate(payload);
  };

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
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={1}
          sx={{
            p: 2,
            bgcolor: isActive ? 'primary.50' : 'grey.50',
            borderRadius: 3,
            border: '1px solid',
            borderColor: isActive ? 'primary.200' : 'grey.200',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              bgcolor: isActive ? 'primary.100' : 'grey.100',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            },
          }}
        >
          <Typography sx={{ fontWeight: 600, color: isActive ? 'primary.main' : 'text.primary' }}>
            {title}
          </Typography>
          <Switch
            checked={isActive}
            onChange={(e) => handleSwitchChange(e.target.checked)}
            sx={{
              '& .MuiSwitch-thumb': {
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              },
            }}
          />
        </Box>

        <Collapse in={isActive}>
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: 'background.paper',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200',
            }}
          >
            {typeKey === 'rephrase' && (
              <Box sx={{ pl: 1, mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Select Rephrase Types:
                </Typography>
                {REPHRASE_SUBOPTIONS.map((opt) => {
                  const checked = variantConfig.rephraseSubtypes?.includes(opt) ?? false;
                  return (
                    <FormControlLabel
                      key={opt}
                      control={
                        <Checkbox
                          checked={checked}
                          onChange={(e) => {
                            setVariantConfig((prev) => ({
                              ...prev,
                              rephraseSubtypes: e.target.checked
                                ? [...(prev.rephraseSubtypes ?? []), opt]
                                : (prev.rephraseSubtypes ?? []).filter((o) => o !== opt),
                            }));
                          }}
                        />
                      }
                      label={opt}
                    />
                  );
                })}
              </Box>
            )}

            {typeKey === 'options' && (
              <>
                <Box sx={{ pl: 1, mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Modify Choices Mode:
                  </Typography>
                  <RadioGroup
                    value={variantConfig.modifyChoiceMode || ''}
                    onChange={(e) => {
                      const mode = e.target.value as 'add' | 'remove';
                      setVariantConfig((prev) => ({ ...prev, modifyChoiceMode: mode }));
                      if (mode === 'add') {
                        setSelectedOptions(mcqOptions);
                      }
                    }}
                  >
                    <FormControlLabel value="add" control={<Radio />} label="Add Distractors" />
                    <FormControlLabel
                      value="remove"
                      control={<Radio />}
                      label="Remove Distractors"
                    />
                  </RadioGroup>
                </Box>

                {optionsList.length > 0 && (
                  <Box sx={{ pl: 1, mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Select which options to modify:
                    </Typography>
                    {optionsList.map((opt, idx) => {
                      const checked = selectedOptions.includes(opt);
                      return (
                        <FormControlLabel
                          key={idx}
                          control={
                            <Checkbox
                              checked={checked}
                              onChange={(e) =>
                                setSelectedOptions((prev) =>
                                  e.target.checked ? [...prev, opt] : prev.filter((o) => o !== opt)
                                )
                              }
                            />
                          }
                          label={`${idx + 1}. ${opt}`}
                        />
                      );
                    })}
                  </Box>
                )}
              </>
            )}

            <TextField
              sx={{ mb: 2 }}
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
          </Box>
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
        Create Question Variant
      </DialogTitle>
      <DialogContent>
        {renderSwitchToggle(
          'Rephrase',
          'rephrase',
          'rephraseInstruction',
          'e.g., simplify language, keep same meaning'
        )}

        {renderSwitchToggle(
          'Modify Choices',
          'options',
          'modifyChoiceInstruction',
          'e.g., randomize but keep correct answer intact',
          mcqOptions
        )}

        {renderSwitchToggle(
          'Thematic Reskinning',
          'conceptual',
          'conceptualInstruction',
          'e.g., apply concept in a real-world scenario'
        )}

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mb: 3,
            p: 3,
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'grey.200',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}
        >
          <FormControl fullWidth>
            <InputLabel sx={{ fontWeight: 500 }}>Difficulty Level</InputLabel>
            <Select
              value={variantConfig.difficulty || ''}
              onChange={(e) => {
                if (!variantConfig.variantTypes.includes('difficulty')) {
                  toggleVariantType('difficulty');
                }
                setVariantConfig((prev) => ({ ...prev, difficulty: e.target.value }));
              }}
              sx={{
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'grey.300',
                },
              }}
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="easy">Easy</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="hard">Hard</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel sx={{ fontWeight: 500 }}>Format Shift</InputLabel>
            <Select
              value={variantConfig.formatType || ''}
              onChange={(e) => {
                if (!variantConfig.variantTypes.includes('formatShift')) {
                  toggleVariantType('formatShift');
                }
                setVariantConfig((prev) => ({ ...prev, formatType: e.target.value }));
              }}
              sx={{
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'grey.300',
                },
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
          sx={{
            color: 'error.main',
            textTransform: 'none',
            mb: 2,
            '&:hover': {
              bgcolor: 'error.50',
              color: 'error.dark',
            },
          }}
        >
          Clear All Selection
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

        <Box
          sx={{
            p: 3,
            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
            borderRadius: 3,
            border: '1px solid #90caf9',
            boxShadow: '0 2px 8px rgba(25, 118, 210, 0.15)',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: 'primary.main',
              fontWeight: 600,
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            Configuration Summary
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            <strong>Active Variants:</strong>{' '}
            {variantConfig.variantTypes.join(', ') || 'None selected'}
            {variantConfig.variantTypes.includes('difficulty') &&
              ` | Difficulty: ${variantConfig.difficulty}`}
            {variantConfig.variantTypes.includes('formatShift') &&
              ` | Format: ${variantConfig.formatType}`}
            {variantConfig.customPrompt &&
              ` | Custom Instructions: "${variantConfig.customPrompt.substring(0, 50)}..."`}
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
          onClick={handleCreateAndReturn}
          sx={{ textTransform: 'none', borderRadius: 2, px: 3 }}
        >
          Create Variant
        </Button>
      </DialogActions>
    </Dialog>
  );
};
