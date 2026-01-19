import { createContext, useContext, useEffect, useState } from 'react';
import { getUserInfo, UserInfo } from '@alea/spec';

interface UserContextType {
  user?: UserInfo | null;
  isUserLoading: boolean;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  isUserLoading: true,
  refresh: async () => {},
});

export const useCurrentUser = () => useContext(UserContext);

export const UserContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const load = async () => {
    setIsUserLoading(true);
    try {
      const u = await getUserInfo();
      setUser(u ?? null);
    } catch (err) {
      setUser(null);
    } finally {
      setIsUserLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  return (
    <UserContext.Provider value={{ user, isUserLoading, refresh: load }}>{children}</UserContext.Provider>
  );
};
