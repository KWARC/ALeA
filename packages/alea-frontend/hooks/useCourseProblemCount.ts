import { useQuery } from '@tanstack/react-query';
import { getCourseProblemCounts } from '@alea/spec';

export function useCourseProblemCounts(courseId: string | null) {
  return useQuery({
    queryKey: ['course-problem-counts', courseId], 
    queryFn: () => getCourseProblemCounts(courseId!), 
    enabled: Boolean(courseId),  
    staleTime: 60 * 60 * 1000,    
  });
}
