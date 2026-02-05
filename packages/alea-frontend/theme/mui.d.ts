import { PaletteColor, PaletteColorOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface TypographyVariants {
    T1: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    T1?: React.CSSProperties;
  }
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

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    T1: true;
  }
}
declare module '@mui/material/styles' {
  interface TypeBackground {
    card?: string;
  }
}