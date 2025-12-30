import type { NextApiRequest, NextApiResponse } from 'next';
import { searchDocs, contentToc } from '@flexiformal/ftml-backend';

async function getDocsFromToc(notesUri: string): Promise<string[]> {
  const [, toc] = (await contentToc({ uri: notesUri })) ?? [];
  const docs: string[] = [];

  const walk = (nodes: any[]) => {
    for (const n of nodes) {
      if (n.uri && !n.uri.includes('#')) {
        docs.push(n.uri);
      }
      if (n.children) walk(n.children);
    }
  };

  walk(toc ?? []);
  return docs;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { query, notesUri } = req.query;

    if (!query || !notesUri) {
      return res.status(400).json([]);
    }

    const docs = await getDocsFromToc(notesUri as string);

    const results = await searchDocs(
      query as string,
      docs,
      15
    );

    res.status(200).json(results ?? []);
  } catch (err) {
    console.error('API searchDocs failed:', err);
    res.status(500).json([]);
  }
}
