import { Box, capitalize, Typography } from '@mui/material';
import { VariantConfig } from './VariantDialog';

export const ConfigurationSummary = ({ variantConfig }: { variantConfig: VariantConfig }) => {
  const VARIANT_LABELS: Record<string, string> = {
    rephrase: 'Minor Edits',
    modifyChoice: 'Modify Choices',
    thematicReskin: 'Thematic Reskin',
  };
  const variantTypeLabels = variantConfig.variantTypes
    .map((v) => VARIANT_LABELS[v] || v)
    .join(' | ');

  const hasAnySelection =
    variantConfig.variantTypes.length > 0 ||
    !!variantConfig.difficulty ||
    !!variantConfig.formatType ||
    !!variantConfig.customPrompt;

  return (
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
        sx={{
          color: 'primary.main',
          fontWeight: 600,
          alignItems: 'center',
        }}
      >
        Configuration Summary
      </Typography>

      {!hasAnySelection ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <strong>None selected</strong>
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          <strong>Active Variants:</strong> {variantTypeLabels}
          {variantConfig.difficulty && ` | Difficulty: ${capitalize(variantConfig.difficulty)}`}
          {variantConfig.formatType && ` | Format: ${capitalize(variantConfig.formatType)}`}
          {variantConfig.customPrompt &&
            ` | Custom Instructions: "${variantConfig.customPrompt.substring(0, 50)}"`}
        </Typography>
      )}
    </Box>
  );
};
