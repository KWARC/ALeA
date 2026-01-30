import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAllCourses } from '@alea/spec';
import { CourseInfo } from '@alea/utils';

interface CourseContextType {
  courses: Record<string, CourseInfo> | undefined;
  isLoading: boolean;
  error: Error | null;
  isValidCourse: (courseId: string) => boolean;
}

const CourseContext = createContext<CourseContextType>({
  courses: undefined,
  isLoading: true,
  error: null,
  isValidCourse: () => false,
});

export const useCourses = () => useContext(CourseContext);

export const CourseProvider = ({ children }: { children: React.ReactNode }) => {
  const [courses, setCourses] = useState<Record<string, CourseInfo> | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchCourses = async () => {
      console.log('CourseContext: Fetching courses...');
      try {
        setIsLoading(true);
        const data = await getAllCourses();
        console.log('CourseContext: Fetched courses:', data ? Object.keys(data).length : 'undefined');
        if (mounted) {
          setCourses(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch courses'));
          console.error('CourseContext: Failed to load global course index:', err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCourses();

    return () => {
      mounted = false;
    };
  }, []);

  const isValidCourse = (courseId: string): boolean => {
    if (!courses || !courseId) return false;
    return !!courses[courseId];
  };

  return (
    <CourseContext.Provider value={{ courses, isLoading, error, isValidCourse }}>
      {children}
    </CourseContext.Provider>
  );
};
