import { Box, Chip, LinearProgress, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { VariantConfig } from './VariantDialog';

interface ThematicReskinOptionsProps {
  themes: string[];
  themesLoading: boolean;
  variantConfig: VariantConfig;
  setVariantConfig: React.Dispatch<React.SetStateAction<VariantConfig>>;
}

export const ThematicReskinOptions = ({
  themes,
  themesLoading,
  variantConfig,
  setVariantConfig,
}: ThematicReskinOptionsProps) => {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(
    variantConfig.selectedTheme || null
  );

  const handleSelectTheme = (theme: string) => {
    setSelectedTheme(theme);
    setVariantConfig((prev) => ({
      ...prev,
      selectedTheme: theme,
    }));
  };

  useEffect(() => {
    if (variantConfig.selectedTheme) {
      setSelectedTheme(variantConfig.selectedTheme);
    }
  }, [variantConfig.selectedTheme]);

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Choose a Problem Theme
      </Typography>

      {themesLoading ? (
        <LinearProgress sx={{ width: '100%', my: 1 }} />
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
};
