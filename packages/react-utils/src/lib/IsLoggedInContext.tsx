import { getCookie } from '@alea/utils';
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface IsLoggedInContextType {
  isLoggedIn: boolean;
}
export const IsLoggedInContext = createContext<IsLoggedInContextType>({
  isLoggedIn: false,
});
export const useIsLoggedIn = () => {
  const loggedIn = useContext(IsLoggedInContext).isLoggedIn;
  return loggedIn || false;
};

export const IsLoggedInProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(getCookie('is_logged_in') === 'true');
  useEffect(() => {
    axios.get('/api/is-logged-in').then((response) => {
      const isLoggedIn = response.data?.isLoggedIn ?? false;
      setIsLoggedIn(isLoggedIn);
    }).catch((err) => {
      console.error('Error checking login status:', err);
      setIsLoggedIn(false);
    });
  }, []);
  return <IsLoggedInContext.Provider value={{ isLoggedIn }}>{children}</IsLoggedInContext.Provider>;
};
