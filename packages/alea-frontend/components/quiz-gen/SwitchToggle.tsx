import {
  Box,
  Checkbox,
  Chip,
  Collapse,
  FormControlLabel,
  LinearProgress,
  Radio,
  RadioGroup,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { generateQuizProblems, QuizProblem } from '@stex-react/api';
import { useEffect, useState } from 'react';
import { ExistingProblem, FlatQuizProblem } from '../../pages/quiz-gen';
import { VariantConfig, VariantType } from './VariantDialog';

interface SwitchToggleProps {
  title: string;
  typeKey: VariantType;
  instructionKey: string;
  placeholder: string;
  variantConfig: VariantConfig;
  themes?: string[];
  themesLoading?: boolean;
  setVariantConfig: React.Dispatch<React.SetStateAction<VariantConfig>>;
  mcqOptions?: string[];
  selectedOptions?: string[];
  problemData?: FlatQuizProblem | ExistingProblem;
  setSelectedOptions?: React.Dispatch<React.SetStateAction<string[]>>;
}

const REPHRASE_SUBOPTIONS = [
  'Technical Rephrasing',
  'Entity Swapping',
  'Numerical Substitution',
  'Add/Remove Distractors',
];

export const SwitchToggle = ({
  title,
  typeKey,
  instructionKey,
  placeholder,
  variantConfig,
  themes = [],
  themesLoading = false,
  setVariantConfig,
  mcqOptions = [],
  selectedOptions = [],
  setSelectedOptions,
  problemData,
}: SwitchToggleProps) => {
  const isActive = variantConfig.variantTypes.includes(typeKey);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(
    variantConfig.selectedTheme || null
  );
  const [newProblemData, setNewProblemData] = useState<QuizProblem | null>(null);

  const handleSwitchChange = (checked: boolean) => {
    setVariantConfig((prev) => {
      let newTypes = [...prev.variantTypes];

      if (checked) {
        if (!newTypes.includes(typeKey)) newTypes.push(typeKey);

        if (typeKey === 'modifyChoice') {
          newTypes = newTypes.filter((t) => t !== 'conceptual');
        }
        if (typeKey === 'conceptual') {
          newTypes = newTypes.filter((t) => t !== 'modifyChoice');
        }
      } else {
        newTypes = newTypes.filter((t) => t !== typeKey);
      }

      return { ...prev, variantTypes: newTypes };
    });
  };

  const handleModeChange = (newMode: 'add' | 'remove') => {
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

    // ✅ If conceptual reskinning is active
    if (typeKey === 'conceptual' && problemData && (problemData as FlatQuizProblem).problemId) {
      const flatProblem = problemData as FlatQuizProblem;

      console.log('Generating single reskin variant for theme:', theme);
      const result = await generateQuizProblems({
        mode: 'variant',
        problemId: flatProblem.problemId,
        variantType: 'reskin',
        theme,
      });

      console.log('Reskin variant result:', result);
      if (result.length > 0) {
        const newVariant: QuizProblem = result[0];
        setNewProblemData(newVariant); // ❌ do NOT flatten
      }
    }
  };

  useEffect(() => {
    if (variantConfig.selectedTheme) {
      setSelectedTheme(variantConfig.selectedTheme);
    }
  }, [variantConfig.selectedTheme]);

  const renderRephraseSuboptions = () => (
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
  );

  const renderModifyChoicesOptions = () => {
    const mode = variantConfig.modifyChoiceMode;

    return (
      <>
        <Box sx={{ pl: 1, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Modify Choices Mode:
          </Typography>
          <RadioGroup
            value={mode || ''}
            onChange={(e) => handleModeChange(e.target.value as 'add' | 'remove')}
          >
            <FormControlLabel value="add" control={<Radio />} label="Add Distractors" />
            <FormControlLabel value="remove" control={<Radio />} label="Remove Distractors" />
          </RadioGroup>
        </Box>

        {mcqOptions.length > 0 && (
          <Box sx={{ pl: 1, mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Select which options to {mode === 'add' ? 'duplicate/modify' : 'remove'}:
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
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Choose a Problem Theme
      </Typography>

      {themesLoading ? (
        <LinearProgress />
      ) : themes.length > 0 ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
      sx={{
        mb: 2,
        border: '1px solid',
        borderColor: isActive ? 'primary.main' : 'grey.300',
        borderRadius: 2,
        overflow: 'hidden',
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
        sx={{
          p: 2,
          bgcolor: isActive ? 'primary.50' : 'grey.50',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            bgcolor: isActive ? 'primary.100' : 'grey.100',
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
            p: 2,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          {typeKey === 'rephrase' && renderRephraseSuboptions()}

          {typeKey === 'modifyChoice' && setSelectedOptions && renderModifyChoicesOptions()}

          {typeKey === 'conceptual' && renderThematicReskinOptions()}

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
    </Box>
  );
};
