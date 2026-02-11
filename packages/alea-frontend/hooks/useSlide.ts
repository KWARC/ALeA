import { useQuery } from '@tanstack/react-query';
import { getSlides, Slide } from '@alea/spec';
import { FTML } from '@flexiformal/ftml';

export function useSlides(courseId: string, sectionId: string) {
  return useQuery<{ slides: Slide[]; css: FTML.Css[] }>({
    queryKey: ['slides', courseId, sectionId],
    queryFn: () => getSlides(courseId, sectionId),
    enabled: Boolean(courseId && sectionId),
    staleTime: Infinity,
  });
}
