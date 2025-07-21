import { Box, Typography } from '@mui/material';
import { VariantConfig } from './VariantDialog';

interface ConfigurationSummaryProps {
  variantConfig: VariantConfig;
}

export const ConfigurationSummary = ({ variantConfig }: ConfigurationSummaryProps) => {
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
        <strong>Active Variants:</strong> {variantConfig.variantTypes.join(', ') || 'None selected'}
        {variantConfig.variantTypes.includes('difficulty') &&
          ` | Difficulty: ${variantConfig.difficulty}`}
        {variantConfig.variantTypes.includes('formatShift') &&
          ` | Format: ${variantConfig.formatType}`}
        {variantConfig.customPrompt &&
          ` | Custom Instructions: "${variantConfig.customPrompt.substring(0, 50)}..."`}
      </Typography>
    </Box>
  );
};
