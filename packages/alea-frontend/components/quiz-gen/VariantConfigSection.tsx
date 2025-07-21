import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { VariantConfig } from './VariantDialog';

interface VariantConfigSectionProps {
  variantConfig: VariantConfig;
  setVariantConfig: React.Dispatch<React.SetStateAction<VariantConfig>>;
  toggleVariantType: (type: string) => void;
}

export const VariantConfigSection = ({
  variantConfig,
  setVariantConfig,
  toggleVariantType,
}: VariantConfigSectionProps) => {
  return (
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
        <InputLabel>Difficulty Level</InputLabel>
        <Select
          value={variantConfig.difficulty || ''}
          label="Difficulty Level"
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
        <InputLabel>Format Shift</InputLabel>
        <Select
          value={variantConfig.formatType || ''}
          label="Format Shift"
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
  );
};
