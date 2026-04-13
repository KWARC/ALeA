import { createTheme, PaletteMode } from '@mui/material/styles';
import { typography } from './typography';
import shadows from './shadows';
import components from './components';
import { lightPalette, darkPalette } from './palette';

export const getTheme = (mode: PaletteMode) =>
  createTheme({
    palette: mode === 'dark' ? darkPalette : lightPalette,
    typography,
    shadows,
    components,
  });
