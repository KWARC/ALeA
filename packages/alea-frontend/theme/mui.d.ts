import { PaletteColor, PaletteColorOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    blue: PaletteColor & { sky?: string };
    gradients: Record<string, string>;
    page: {
      background: string;
    };
  }

  interface PaletteOptions {
    blue?: PaletteColorOptions & { sky?: string };
    gradients?: Record<string, string>;
    page?: {
      background: string;
    };
  }
}
