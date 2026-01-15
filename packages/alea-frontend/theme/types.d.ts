import '@mui/material/styles';

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
