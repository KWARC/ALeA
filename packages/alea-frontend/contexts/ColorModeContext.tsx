import { createContext, useContext } from 'react';

export const ColorModeContext = createContext({
  toggleColorMode: () => {
    // Placeholder
  },
  setMode: (mode: 'light' | 'dark' | 'system') => {
    // Placeholder
  },
  mode: 'system' as 'light' | 'dark' | 'system',
});

export const useColorMode = () => useContext(ColorModeContext);
