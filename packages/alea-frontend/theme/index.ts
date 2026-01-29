import { createTheme, PaletteMode } from '@mui/material/styles';
import '@mui/material/styles';

import { typography } from './typography';
import shadows from './shadows';
import components from './components';
import { lightPalette, darkPalette } from './palette';

declare module '@mui/material/styles' {
  interface Palette {
    header: {
      main: string;
      text: string;
    };
    section: {
      secondary: string;
    };
    card: {
      background: string;
      border: string;
    };
    page: {
      background: string;
    };
  }

  interface PaletteOptions {
    header?: {
      main: string;
      text: string;
    };
    section?: {
      secondary: string;
    };
    card?: {
      background: string;
      border: string;
    };
    page?: {
      background: string;
    };
  }
}

export const getTheme = (mode: PaletteMode) =>
  createTheme({
    palette: mode === 'dark' ? darkPalette : lightPalette,
    typography,
    shadows,
    components,
  });
