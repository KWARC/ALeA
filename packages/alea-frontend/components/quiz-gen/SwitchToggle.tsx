import {
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { generateQuizProblems, QuizProblem } from '@stex-react/api';
import { useEffect, useState } from 'react';
import { FlatQuizProblem } from '../../pages/quiz-gen';
import { VariantConfig, VariantType } from './VariantDialog';

interface SwitchToggleProps {
  title: string;
  typeKey: VariantType;
  instructionKey?: string;
  placeholder?: string;
  variantConfig: VariantConfig;
  themes?: string[];
  setVariantConfig: React.Dispatch<React.SetStateAction<VariantConfig>>;
  problemData?: FlatQuizProblem;
  onVariantGenerated?: (newVariant: QuizProblem) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export type MinorEditType =
  | 'change_data_format'
  | 'change_goal'
  | 'convert_units'
  | 'negate_question_stem'
  | 'substitute_numbers';

const MINOR_EDIT_LABELS: Record<MinorEditType, string> = {
  change_data_format: 'Change Data Format',
  change_goal: 'Change Goal',
  convert_units: 'Convert Units',
  negate_question_stem: 'Negate Question Stem',
  substitute_numbers: 'Substitute Numbers',
};

const MINOR_EDIT_SUBOPTIONS: MinorEditType[] = Object.keys(MINOR_EDIT_LABELS) as MinorEditType[];

export const SwitchToggle = ({
  title,
  typeKey,
  instructionKey,
  placeholder,
  variantConfig,
  themes = [],
  setVariantConfig,
  problemData,
  onVariantGenerated,
  onLoadingChange,
}: SwitchToggleProps) => {
  const isActive = variantConfig.variantTypes.includes(typeKey);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(
    variantConfig.selectedTheme || null
  );
  const mcqOptions = problemData?.options || [];

  const handleSwitchChange = (checked: boolean) => {
    setVariantConfig((prev) => {
      let newTypes = [...prev.variantTypes];

      if (checked) {
        if (!newTypes.includes(typeKey)) newTypes.push(typeKey);

        if (typeKey === 'modifyChoice') {
          newTypes = newTypes.filter((t) => t !== 'thematicReskin');
          setSelectedOptions?.(mcqOptions);
        }
        if (typeKey === 'thematicReskin') {
          newTypes = newTypes.filter((t) => t !== 'modifyChoice');
        }
      } else {
        newTypes = newTypes.filter((t) => t !== typeKey);
        if (typeKey === 'modifyChoice') {
          setSelectedOptions?.([]);
        }
      }
      return { ...prev, variantTypes: newTypes };
    });
  };

  const handleModeChange = (newMode: 'add' | 'replace') => {
    setVariantConfig((prev) => ({ ...prev, modifyChoiceMode: newMode }));
    if (newMode === 'add') {
      setSelectedOptions?.(mcqOptions);
    } else {
      setSelectedOptions?.([]);
    }
  };

  const handleSelectTheme = async (theme: string) => {
    setSelectedTheme(theme);
    setVariantConfig((prev) => ({
      ...prev,
      selectedTheme: theme,
    }));
    if (typeKey === 'thematicReskin' && problemData.problemId) {
      onLoadingChange?.(true);

      try {
        const result = await generateQuizProblems({
          mode: 'variant',
          problemId: problemData.problemId,
          variantType: 'reskin',
          theme,
        });

        if (result.length > 0) {
          const newVariant = result[0];
          onVariantGenerated?.(newVariant);
        }
      } finally {
        onLoadingChange?.(false);
      }
    }
  };

  const handleMinorEdit = async (types: MinorEditType) => {
    if (typeKey === 'minorEdit' && problemData?.problemId) {
      onLoadingChange?.(true);

      try {
        const result = await generateQuizProblems({
          mode: 'variant',
          problemId: problemData.problemId,
          variantType: 'minor_edit',
          minorEditType: types,
          minorEditInstruction: variantConfig[instructionKey],
        });

        if (result.length > 0) {
          const newVariant = result[0];
          onVariantGenerated?.(newVariant);
        }
        console.log({ types });
      } finally {
        onLoadingChange?.(false);
      }
    }
  };

  const handleModifyChoice = async (modifyChoiceMode: string) => {
    if (typeKey === 'modifyChoice' && problemData?.problemId) {
      onLoadingChange?.(true);
      try {
        const result = await generateQuizProblems({
          mode: 'variant',
          problemId: problemData.problemId,
          variantType: 'modify_choices',
          optionsToModify: variantConfig.modifyChoiceMode,
          modifyChoiceInstruction: variantConfig[instructionKey],
        });
        if (result.length > 0) {
          const newVariant = result[0];
          onVariantGenerated?.(newVariant);
        }
      } finally {
        onLoadingChange?.(false);
      }
    }
  };

  useEffect(() => {
    if (variantConfig.selectedTheme) {
      setSelectedTheme(variantConfig.selectedTheme);
    }
  }, [variantConfig.selectedTheme]);

  const renderMinorEditSuboptions = () => (
    <Box pl={1} mb={2}>
      <Typography variant="subtitle2" color="text.secondary" mb={1}>
        Select Minor Edit Type:
      </Typography>
      <RadioGroup
        value={variantConfig.minorEditSubtypes || ''}
        onChange={(e) => {
          const selected = e.target.value as MinorEditType;
          setVariantConfig((prev) => ({
            ...prev,
            minorEditSubtypes: selected, 
          }));
        }}
      >
        {MINOR_EDIT_SUBOPTIONS.map((opt) => (
          <FormControlLabel
            key={opt}
            value={opt}
            control={<Radio />}
            label={MINOR_EDIT_LABELS[opt]}
          />
        ))}
      </RadioGroup>
    </Box>
  );

  const renderModifyChoicesOptions = () => {
    const mode = variantConfig.modifyChoiceMode;

    return (
      <>
        <Box pl={1} mb={2}>
          <Typography variant="subtitle2" color="text.secondary" mb={1}>
            Modify Choices Mode:
          </Typography>
          <RadioGroup
            value={mode || ''}
            onChange={(e) => handleModeChange(e.target.value as 'add' | 'replace')}
          >
            <FormControlLabel value="add" control={<Radio />} label="Add Distractors" />
            <FormControlLabel value="replace" control={<Radio />} label="Replace Distractors" />
          </RadioGroup>
        </Box>

        {mcqOptions.length > 0 && (
          <Box sx={{ pl: 1, mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>
              Select which options to {mode === 'add' ? 'duplicate/modify' : 'replace'}:
            </Typography>
            {mcqOptions.map((opt, idx) => (
              <FormControlLabel
                key={`${idx}-${opt}`}
                control={
                  <Checkbox
                    checked={selectedOptions.includes(opt)}
                    onChange={(e) =>
                      setSelectedOptions?.((prev) =>
                        e.target.checked ? [...prev, opt] : prev.filter((o) => o !== opt)
                      )
                    }
                  />
                }
                label={`${idx + 1}. ${opt}`}
              />
            ))}
          </Box>
        )}
      </>
    );
  };

  const renderThematicReskinOptions = () => (
    <Box mb={2}>
      <Typography variant="subtitle2" mb={1}>
        Choose a Problem Theme
      </Typography>

      {themes.length > 0 ? (
        <Box display="flex" flexWrap="wrap" gap={1}>
          {themes.map((theme) => (
            <Chip
              key={theme}
              label={theme}
              clickable
              color={selectedTheme === theme ? 'primary' : 'default'}
              onClick={() => handleSelectTheme(theme)}
            />
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No alternative themes available
        </Typography>
      )}
    </Box>
  );

  return (
    <Box
      mb={2}
      border="1px solid"
      borderColor={isActive ? 'primary.main' : 'grey.300'}
      borderRadius={2}
      overflow="hidden"
      sx={{
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: isActive ? 'primary.dark' : 'grey.400',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        },
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        p={2}
        bgcolor={isActive ? 'primary.50' : 'grey.50'}
        sx={{
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            bgcolor: isActive ? 'primary.100' : 'grey.100',
          },
        }}
      >
        <Typography fontWeight={600} color={isActive ? 'primary.main' : 'text.primary'}>
          {title}
        </Typography>
        <Switch checked={isActive} onChange={(e) => handleSwitchChange(e.target.checked)} />
      </Box>

      <Collapse in={isActive}>
        <Box p={2} bgcolor="background.paper" borderTop="1px solid" borderColor="grey.200">
          {typeKey === 'minorEdit' && renderMinorEditSuboptions()}

          {typeKey === 'modifyChoice' && setSelectedOptions && renderModifyChoicesOptions()}

          {typeKey === 'thematicReskin' && renderThematicReskinOptions()}

          {instructionKey && (
            <TextField
              sx={{ mb: 2 }}
              label={`${title} Instructions(Optional)`}
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
          )}
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {typeKey === 'minorEdit' && (
              <Button
                variant="contained"
                onClick={() => handleMinorEdit(variantConfig.minorEditSubtypes as MinorEditType)}
                disabled={!variantConfig.minorEditSubtypes}
              >
                Generate
              </Button>
            )}

            {typeKey === 'modifyChoice' && (
              <Button
                variant="contained"
                onClick={() => handleModifyChoice(variantConfig.modifyChoiceMode || '')}
                disabled={!selectedOptions?.length}
              >
                Generate Modified Choice Variant
              </Button>
            )}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
};
