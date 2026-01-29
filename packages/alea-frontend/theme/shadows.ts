import { Shadows } from '@mui/material/styles';

const shadows: Shadows = [
  'none',
  '0px 1px 3px rgba(0,0,0,0.12)',
  '0px 3px 6px rgba(0,0,0,0.14)',
  '0px 6px 12px rgba(0,0,0,0.16)',
  '0px 10px 24px rgba(0,0,0,0.18)',
  '0 4px 8px 0 rgba(0, 0, 0, 0.2)',
  ...Array(20).fill('none'),
] as Shadows;

export default shadows;
