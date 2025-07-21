import { Box, Checkbox, FormControlLabel, Radio, RadioGroup, Typography } from '@mui/material';
import { VariantConfig } from './VariantDialog';

interface ModifyChoicesOptionsProps {
  variantConfig: VariantConfig;
  setVariantConfig: React.Dispatch<React.SetStateAction<VariantConfig>>;
  mcqOptions: string[];
  selectedOptions: string[];
  setSelectedOptions: React.Dispatch<React.SetStateAction<string[]>>;
}

export const ModifyChoicesOptions = ({
  variantConfig,
  setVariantConfig,
  mcqOptions,
  selectedOptions,
  setSelectedOptions,
}: ModifyChoicesOptionsProps) => {
  return (
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
          <FormControlLabel value="remove" control={<Radio />} label="Remove Distractors" />
        </RadioGroup>
      </Box>

      {mcqOptions.length > 0 && (
        <Box sx={{ pl: 1, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Select which options to modify:
          </Typography>
          {mcqOptions.map((opt, idx) => {
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
  );
};
