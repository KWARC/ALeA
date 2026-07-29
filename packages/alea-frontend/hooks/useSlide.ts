import { useQuery } from '@tanstack/react-query';
import { getSlides, Slide } from '@alea/spec';
import { FTML } from '@flexiformal/ftml';

export function useSlides(courseId: string, sectionId: string, institutionId?: string) {
  return useQuery<{ slides: Slide[]; css: FTML.Css[] }>({
    queryKey: ['slides', courseId, sectionId, institutionId],
    queryFn: () => getSlides(courseId, sectionId, institutionId),
    enabled: Boolean(courseId && sectionId),
    staleTime: Infinity,
  });
}
