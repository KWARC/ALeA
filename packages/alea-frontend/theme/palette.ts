import { PaletteOptions } from '@mui/material/styles';

export const lightPalette: PaletteOptions = {
  mode: 'light',

  primary: {
    main: '#1E40AF',
    contrastText: '#FFFFFF',
  },

  secondary: {
    main: '#475569',
    contrastText: '#FFFFFF',
  },

  background: {
    default: '#F5F7FB',
    paper: '#FFFFFF',
  },

  text: {
    primary: '#0F172A',
    secondary: '#475569',
  },

  header: {
    main: '#1E40AF',
    text: '#FFFFFF',
  },

  section: {
    secondary: '#EEF2F7',
  },

  card: {
    background: '#FFFFFF',
    border: '#E2E8F0',
  },

  page: {
    background: '#F5F7FB',
  },
};

export const darkPalette: PaletteOptions = {
  mode: 'dark',

  primary: {
    main: '#60A5FA',
    contrastText: '#0F172A',
  },

  secondary: {
    main: '#94A3B8',
    contrastText: '#0F172A',
  },

  background: {
    default: '#020617',
    paper: '#0F172A',
  },

  text: {
    primary: '#E5E7EB',
    secondary: '#9CA3AF',
  },

  header: {
    main: '#020617',
    text: '#E5E7EB',
  },

  section: {
    secondary: '#020617',
  },

  card: {
    background: '#0F172A',
    border: '#1E293B',
  },

  page: {
    background: '#020617',
  },
};
