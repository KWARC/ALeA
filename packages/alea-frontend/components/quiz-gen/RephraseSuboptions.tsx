import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material';
import { VariantConfig } from './VariantDialog';

interface RephraseSuboptionsProps {
  variantConfig: VariantConfig;
  setVariantConfig: React.Dispatch<React.SetStateAction<VariantConfig>>;
}

const REPHRASE_SUBOPTIONS = [
  'Technical Rephrasing',
  'Entity Swapping',
  'Numerical Substitution',
  'Add/Remove Distractors',
];

export const RephraseSuboptions = ({
  variantConfig,
  setVariantConfig,
}: RephraseSuboptionsProps) => {
  return (
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
};
