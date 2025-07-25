import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { VariantConfig } from './VariantDialog';

interface VariantConfigSectionProps {
  variantConfig: VariantConfig;
  setVariantConfig: React.Dispatch<React.SetStateAction<VariantConfig>>;
}

export const VariantConfigSection = ({
  variantConfig,
  setVariantConfig,
}: VariantConfigSectionProps) => {
  const normalizeSelect = (value: string) => (value === 'none' ? '' : value);
  return (
    <Box
      display="flex"
      gap={2}
      mb={3}
      p={3}
      border="1px solid"
      borderRadius={3}
      borderColor="divider"
      sx={{
        background: (theme) =>
          `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[100]} 100%)`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      <FormControl fullWidth>
        <InputLabel>Difficulty Level</InputLabel>
        <Select
          value={variantConfig.difficulty || ''}
          label="Difficulty Level"
          onChange={(e) =>
            setVariantConfig((prev) => ({
              ...prev,
              difficulty: normalizeSelect(e.target.value),
            }))
          }
          sx={{
            borderRadius: 2,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'grey.300',
            },
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
          label="Format Shift"
          onChange={(e) =>
            setVariantConfig((prev) => ({
              ...prev,
              formatType: normalizeSelect(e.target.value),
            }))
          }
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
  );
};
