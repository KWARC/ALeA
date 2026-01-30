import { getCookie } from '@alea/utils';
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface IsLoggedInContextType {
  loggedIn: boolean;
  loginCheckPending: boolean;
}
export const IsLoggedInContext = createContext<IsLoggedInContextType>({
  loggedIn: false,
  loginCheckPending: true,
});
export const useIsLoggedIn = () => {
  return useContext(IsLoggedInContext);
};

export const IsLoggedInProvider = ({ children }: { children: React.ReactNode }) => {
  const [loggedIn, setLoggedIn] = useState(getCookie('is_logged_in') === 'true');
  const [loginCheckPending, setLoginCheckPending] = useState(true);

  useEffect(() => {
    axios
      .get('/api/is-logged-in')
      .then((response) => {
        const isLoggedIn = response.data?.isLoggedIn ?? false;
        setLoggedIn(isLoggedIn);
      })
      .catch((err) => {
        console.error('Error checking login status:', err);
        setLoggedIn(false);
      })
      .finally(() => {
        setLoginCheckPending(false);
      });
  }, []);
  return (
    <IsLoggedInContext.Provider value={{ loggedIn, loginCheckPending: loginCheckPending }}>
      {children}
    </IsLoggedInContext.Provider>
  );
};
