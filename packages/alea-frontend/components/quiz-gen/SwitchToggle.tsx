import { Box, Collapse, Switch, TextField, Typography } from '@mui/material';
import { ModifyChoicesOptions } from './ModifyChoicesOptions';
import { RephraseSuboptions } from './RephraseSuboptions';
import { VariantConfig } from './VariantDialog';

interface SwitchToggleProps {
  title: string;
  typeKey: string;
  instructionKey: string;
  placeholder: string;
  variantConfig: VariantConfig;
  setVariantConfig: React.Dispatch<React.SetStateAction<VariantConfig>>;
  mcqOptions?: string[];
  selectedOptions?: string[];
  setSelectedOptions?: React.Dispatch<React.SetStateAction<string[]>>;
}

export const SwitchToggle = ({
  title,
  typeKey,
  instructionKey,
  placeholder,
  variantConfig,
  setVariantConfig,
  mcqOptions = [],
  selectedOptions = [],
  setSelectedOptions,
}: SwitchToggleProps) => {
  const isActive = variantConfig.variantTypes.includes(typeKey);

  const handleSwitchChange = (checked: boolean) => {
    setVariantConfig((prev) => {
      let newTypes = [...prev.variantTypes];

      if (checked) {
        if (!newTypes.includes(typeKey)) newTypes.push(typeKey);

        if (typeKey === 'options') newTypes = newTypes.filter((t) => t !== 'conceptual');
        if (typeKey === 'conceptual') newTypes = newTypes.filter((t) => t !== 'options');
      } else {
        newTypes = newTypes.filter((t) => t !== typeKey);
      }

      return { ...prev, variantTypes: newTypes };
    });
  };

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
          {typeKey === 'rephrase' && (
            <RephraseSuboptions variantConfig={variantConfig} setVariantConfig={setVariantConfig} />
          )}

          {typeKey === 'options' && setSelectedOptions && (
            <ModifyChoicesOptions
              variantConfig={variantConfig}
              setVariantConfig={setVariantConfig}
              mcqOptions={mcqOptions}
              selectedOptions={selectedOptions}
              setSelectedOptions={setSelectedOptions}
            />
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
    </Box>
  );
};
