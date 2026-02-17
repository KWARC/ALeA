import { getAllCourses } from '@alea/spec';
import type { CourseInfo } from '@alea/utils';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface CourseContextType {
  courses: Record<string, CourseInfo> | undefined;
  isLoading: boolean;
  error: Error | null;
  isValidCourse: (courseId: string) => boolean;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

interface CourseProviderProps {
  children: ReactNode;
}

export function CourseProvider({ children }: CourseProviderProps) {
  const [courses, setCourses] = useState<Record<string, CourseInfo> | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCourses = async () => {
      try {
        setIsLoading(true);
        const data = (await getAllCourses()) as Record<string, CourseInfo>;
        if (!isMounted) return;
        setCourses(data ?? undefined);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err : new Error('Failed to fetch courses'));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  const isValidCourse = useMemo(
    () => (courseId: string) => {
      if (!courses || !courseId) return false;
      return Object.prototype.hasOwnProperty.call(courses, courseId);
    },
    [courses]
  );

  const value = useMemo<CourseContextType>(
    () => ({
      courses,
      isLoading,
      error,
      isValidCourse,
    }),
    [courses, isLoading, error, isValidCourse]
  );

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}

export function useCourses(): CourseContextType {
  const ctx = useContext(CourseContext);
  if (!ctx) {
    throw new Error('useCourses must be used within a CourseProvider');
  }
  return ctx;
}

