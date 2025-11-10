import React, { createContext, useContext, useState, useCallback } from 'react';

interface CommentRefreshContextType {
  refreshKey: number;
  triggerRefresh: () => void;
}

const CommentRefreshContext = createContext<CommentRefreshContextType>({
  refreshKey: 0,
  triggerRefresh: () => {},
});

export const useCommentRefresh = () => useContext(CommentRefreshContext);

export const CommentRefreshProvider = ({ children }: { children: React.ReactNode }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  return (
    <CommentRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </CommentRefreshContext.Provider>
  );
};
