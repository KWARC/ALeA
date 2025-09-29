import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getCurrentTermForCourseId, getCurrentTermForUniversity } from '@alea/utils';

interface CurrentTermContextType {
  currentTerm: string;
  loading: boolean;
  error: string | null;
  setCourseId: (courseId: string) => void;
  setUniversityId: (universityId: string) => void;
  refreshTerm: () => Promise<void>;
}

const CurrentTermContext = createContext<CurrentTermContextType | undefined>(undefined);

interface CurrentTermProviderProps {
  children: ReactNode;
  initialCourseId?: string;
  initialUniversityId?: string;
}

export function CurrentTermProvider({
  children,
  initialCourseId,
  initialUniversityId,
}: CurrentTermProviderProps) {
  const [currentTerm, setCurrentTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseId, setCourseIdState] = useState<string | undefined>(initialCourseId);
  const [universityId, setUniversityIdState] = useState<string | undefined>(initialUniversityId);

  const resolveTerm = async () => {
    setLoading(true);
    setError(null);

    try {
      if (courseId) {
        const term = await getCurrentTermForCourseId(courseId);
        setCurrentTerm(term);
      } else if (universityId) {
        const term = getCurrentTermForUniversity(universityId);
        setCurrentTerm(term);
      } else {
        const term = getCurrentTermForUniversity('FAU');
        setCurrentTerm(term);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resolve term';
      setError(errorMessage);
      console.error('Error resolving current term:', err);
      setCurrentTerm(getCurrentTermForUniversity('FAU'));
    } finally {
      setLoading(false);
    }
  };

  const setCourseId = (newCourseId: string) => {
    setCourseIdState(newCourseId);
    setUniversityIdState(undefined);
  };

  const setUniversityId = (newUniversityId: string) => {
    setUniversityIdState(newUniversityId);
    setCourseIdState(undefined);
  };

  const refreshTerm = async () => {
    await resolveTerm();
  };

  useEffect(() => {
    resolveTerm();
  }, [courseId, universityId]);

  const value: CurrentTermContextType = {
    currentTerm,
    loading,
    error,
    setCourseId,
    setUniversityId,
    refreshTerm,
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
