import { contentToc, TocElem } from '@flexiformal/ftml-backend';
import { useQuery } from '@tanstack/react-query';

export function useContentToc(notesUri: string) {
  return useQuery<TocElem[]>({
    queryKey: ['content-toc', notesUri],
    queryFn: async () => {
      if (!notesUri) return [];
      const toc = await contentToc({ uri: notesUri });
      return toc?.[1] ?? []; 
    },
    enabled: Boolean(notesUri),
    staleTime: Infinity,
  });
}
