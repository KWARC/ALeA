import { createContext, useContext, useEffect, useState } from 'react';
import { getUserInfo, getUserInformation, UserInfo } from '@alea/spec';

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
      if (!u) {
        setUser(null);
        return;
      }
      try {
        const info = await getUserInformation(true);
        if (info?.userId) {
          const givenName = info.firstName ?? u.givenName;
          const sn = info.lastName ?? u.sn;
          setUser({
            ...u,
            userId: info.userId,
            givenName,
            sn,
            fullName: `${givenName ?? ''} ${sn ?? ''}`.trim(),
          });
          return;
        }
      } catch {
        /* no database account */
      }
      const tokenIdIsNotUserId = u.authKind === 'cdi' || u.authKind === 'fake';
      setUser(tokenIdIsNotUserId ? { ...u, userId: '' } : u);
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
