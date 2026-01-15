import { createContext, useContext } from 'react';

export const ColorModeContext = createContext({
  toggleColorMode: () => {
    // Placeholder
  },
  mode: 'light',
});

export const useColorMode = () => useContext(ColorModeContext);
