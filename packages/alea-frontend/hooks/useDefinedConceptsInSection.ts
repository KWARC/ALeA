import { ConceptAndDefinition, getDefiniedaInSectionAgg } from '@alea/spec';
import { useQuery } from '@tanstack/react-query';


export function useDefiniedaInSectionAgg(sectionUri: string | null) {
  return useQuery<ConceptAndDefinition[]>({
    queryKey: ['defined-concepts-and-definition', sectionUri],
    enabled: Boolean(sectionUri),
    queryFn: () => getDefiniedaInSectionAgg(sectionUri),
    staleTime: Infinity,
  });
}