import {
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { generateQuizProblems, QuizProblem } from '@stex-react/spec';
import { useEffect, useState } from 'react';
import { FlatQuizProblem } from '../../pages/quiz-gen';
import { ScaffoldingDetails, VariantConfig, VariantType } from './VariantDialog';

interface SwitchToggleProps {
  title: string;
  typeKey: VariantType;
  instructionKey?: string;
  placeholder?: string;
  variantConfig: VariantConfig;
  themes?: string[];
  scaffoldingDetails?: ScaffoldingDetails;
  setVariantConfig: React.Dispatch<React.SetStateAction<VariantConfig>>;
  problemData?: FlatQuizProblem;
  availableMinorEdits?: MinorEditType[];
  onVariantGenerated?: (newVariant: QuizProblem) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export type MinorEditType =
  | 'change_data_format'
  | 'change_goal'
  | 'goal_inversion'
  | 'convert_units'
  | 'negate_question_stem'
  | 'substitute_values';

const MINOR_EDIT_LABELS: Record<MinorEditType, string> = {
  change_data_format: 'Change Data Format',
  change_goal: 'Change Goal',
  goal_inversion: 'Invert Goal',
  convert_units: 'Convert Units',
  negate_question_stem: 'Negate Question Stem',
  substitute_values: 'Substitute Values',
};

function RenderScaffoldingDetails({
  selectedScaffolding,
  numSubQuestions = 1,
  setSelectedScaffolding,
  setNumSubQuestions,
  maxSubQuestions,
}: {
  selectedScaffolding: 'high' | 'reduced';
  numSubQuestions?: number;
  setSelectedScaffolding: (value: 'high' | 'reduced') => void;
  setNumSubQuestions?: (value: number) => void;
  maxSubQuestions?: number;
}) {
  return (
    <Box pl={1} mb={2}>
      <Typography variant="subtitle2" color="text.secondary" mb={1}>
        Scaffolding Options:
      </Typography>

      <RadioGroup
        value={selectedScaffolding}
        onChange={(e) => setSelectedScaffolding(e.target.value as 'high' | 'reduced')}
      >
        <Box display="flex" alignItems="center" mb={1}>
          <Tooltip title="High Scaffolding: breaks the problem into multiple guided sub-questions, reducing cognitive load.">
            <FormControlLabel value="high" control={<Radio />} label="High Scaffolding" />
          </Tooltip>
          {selectedScaffolding === 'high' && (
            <Tooltip title={`Select number of sub-questions to break the problem into`}>
              <Select
                size="small"
                value={numSubQuestions}
                onChange={(e) => setNumSubQuestions(Number(e.target.value))}
                sx={{ ml: 2, width: 80 }}
              >
                {Array.from({ length: maxSubQuestions }, (_, i) => i + 1).map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </Select>
            </Tooltip>
          )}
        </Box>
        <Tooltip title="Reduced Scaffolding: presents the problem as a single step without breaking into sub-questions.">
          <FormControlLabel value="reduced" control={<Radio />} label="Reduced Scaffolding" />
        </Tooltip>
      </RadioGroup>
    </Box>
  );
}

export const SwitchToggle = ({
  title,
  typeKey,
  instructionKey,
  placeholder,
  variantConfig,
  themes = [],
  scaffoldingDetails,
  setVariantConfig,
  problemData,
  availableMinorEdits,
  onVariantGenerated,
  onLoadingChange,
}: SwitchToggleProps) => {
  const isActive = variantConfig.variantTypes.includes(typeKey);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(
    variantConfig.selectedTheme || null
  );
  const { high, reduced } = scaffoldingDetails || {};
  const [selectedScaffolding, setSelectedScaffolding] = useState<'high' | 'reduced'>(
    high?.applicable ? 'high' : reduced?.applicable ? 'reduced' : 'high'
  );
  const [numSubQuestions, setNumSubQuestions] = useState(high?.numSubQuestions || null);
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

  const handleMinorEdit = async (type: MinorEditType) => {
    if (typeKey === 'minorEdit' && problemData?.problemId) {
      onLoadingChange?.(true);

      try {
        const result = await generateQuizProblems({
          mode: 'variant',
          problemId: problemData.problemId,
          variantType: 'minor_edit',
          minorEditType: type,
          minorEditInstruction: variantConfig[instructionKey],
        });

        if (result.length > 0) {
          const newVariant = result[0];
          onVariantGenerated?.(newVariant);
        }
        console.log({ type });
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
          modifyType: variantConfig.modifyChoiceMode,
          optionsToModify: selectedOptions,
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
const handleScaffold = async (selectedScaffolding: 'high' | 'reduced', numSubQuestions: number) => {
  if (!problemData?.problemId) return;
  onLoadingChange?.(true);
  try {
    const result = await generateQuizProblems({
      mode: 'variant',
      problemId: problemData.problemId,
      variantType: 'scaffolding', 
      scaffoldingType: selectedScaffolding,
      numSubQuestions: selectedScaffolding === 'high' ? numSubQuestions : undefined, 
    });

    if (result.length > 0) {
      const newVariant = result[0];
      onVariantGenerated?.(newVariant);
    }
  } finally {
    onLoadingChange?.(false);
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
        {(availableMinorEdits || []).map((opt) => (
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
          {typeKey === 'scaffolding' && (
            <RenderScaffoldingDetails
              selectedScaffolding={selectedScaffolding}
              numSubQuestions={numSubQuestions}
              setSelectedScaffolding={setSelectedScaffolding}
              setNumSubQuestions={setNumSubQuestions}
              maxSubQuestions={scaffoldingDetails?.high?.numSubQuestions ?? 1}
            />
          )}

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
                disabled={!variantConfig.modifyChoiceMode || !selectedOptions?.length}
              >
                Generate Modified Choice Variant
              </Button>
            )}
            {typeKey === 'scaffolding' && (
              <Button
                variant="contained"
                onClick={() => handleScaffold(selectedScaffolding,numSubQuestions)}
              >
                Generate
              </Button>
            )}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
};
