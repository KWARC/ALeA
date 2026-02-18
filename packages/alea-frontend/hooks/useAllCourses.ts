import { getAllCourses } from '@alea/spec';
import { CourseInfo } from '@alea/utils';
import { useQuery } from '@tanstack/react-query';

export function useAllCourses(universityId?: string) {
  return useQuery<Record<string, CourseInfo>>({
    queryKey: ['all-courses', universityId ?? 'FAU'],
    queryFn: () => getAllCourses(universityId),
    staleTime: Infinity,
  });
}
