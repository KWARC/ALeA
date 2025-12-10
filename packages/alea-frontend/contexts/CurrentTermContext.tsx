import { UNIVERSITY_TERMS } from '@alea/utils';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentTerm } from '@alea/spec';

interface CurrentTermContextType {
  currentTermByCourseId: Record<string, string>;
  currentTermByUniversityId: Record<string, string>;
  loadingTermByCourseId: boolean;
  error: string | null;
}

const CurrentTermContext = createContext<CurrentTermContextType | undefined>(undefined);

interface CurrentTermProviderProps {
  children: ReactNode;
  initialCourseId?: string;
  initialUniversityId?: string;
}

export function CurrentTermProvider({ children }: CurrentTermProviderProps) {
  const [currentTermByCourseId, setCurrentTermByCourseId] = useState<Record<string, string>>({});
  const [loadingTermByCourseId, setLoadingTermByCourseId] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentTermByUniversityId = useMemo(() => {
    return Object.fromEntries(
      Object.entries(UNIVERSITY_TERMS).map(([key, value]) => [key, value.currentTerm])
    );
  }, []);

  useEffect(() => {
    const fetchCurrentTermByCourseId = async () => {
      try {
        setLoadingTermByCourseId(true);
        const currentTermData = await getCurrentTerm();
        setCurrentTermByCourseId(currentTermData as Record<string, string>);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get current term by course id');
      } finally {
        setLoadingTermByCourseId(false);
      }
    };
    fetchCurrentTermByCourseId();
  }, []);

  const value: CurrentTermContextType = {
    currentTermByCourseId,
    currentTermByUniversityId,
    loadingTermByCourseId,
    error,
  };

  return <CurrentTermContext.Provider value={value}>{children}</CurrentTermContext.Provider>;
}

export function useCurrentTermContext(): CurrentTermContextType {
  const context = useContext(CurrentTermContext);
  if (context === undefined) {
    throw new Error('useCurrentTermContext must be used within a CurrentTermProvider');
  }
  return context;
}
