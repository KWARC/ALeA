import '@mui/material/styles';

export interface TypeGradients {
  'iwgs-1': string;
  'iwgs-2': string;
  krmt: string;
  gdp: string;
  rip: string;
  spinf: string;
}

declare module '@mui/material/styles' {
  interface Palette {
    gradients: TypeGradients;
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
    gradients?: Partial<TypeGradients>;
    header?: {
      main?: string;
      text?: string;
    };
    section?: {
      secondary?: string;
    };
    card?: {
      background?: string;
      border?: string;
    };
    page?: {
      background?: string;
    };
  }
}
