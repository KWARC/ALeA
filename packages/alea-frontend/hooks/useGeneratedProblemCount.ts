import { getCourseGeneratedProblemsCountBySection } from '@alea/spec';
import { useQuery } from '@tanstack/react-query';

export function useGeneratedProblemsCount(courseId: string | null) {
  return useQuery({
    queryKey: ['generated-problems-count', courseId],
    queryFn: () => getCourseGeneratedProblemsCountBySection(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 60 * 1000, 
  });
}
