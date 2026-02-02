import { Color, createTheme, PaletteMode } from '@mui/material/styles';
import '@mui/material/styles';

import { typography } from './typography';
import shadows from './shadows';
import components from './components';
import { lightPalette, darkPalette } from './palette';

declare module '@mui/material/styles' {
  interface Palette {
    blue: Color & { sky?: string };
    gradients: Record<string, string>;
  }
  interface PaletteOptions {
    blue?: Partial<Color & { sky?: string }>;
    gradients?: Record<string, string>;
  }
}

export const getTheme = (mode: PaletteMode) =>
  createTheme({
    palette: mode === 'dark' ? darkPalette : lightPalette,
    typography,
    shadows,
    components,
  });
