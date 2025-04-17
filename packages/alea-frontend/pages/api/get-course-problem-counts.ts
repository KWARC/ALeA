import {
  DocumentElementURI,
  TOCElem,
  getCourseInfo,
  getDocumentSections,
  getProblemsForSection,
} from '@stex-react/api';
import { NextApiRequest, NextApiResponse } from 'next';

export const EXCLUDED_CHAPTERS = ['Preface', 'Administrativa', 'Resources'];

interface CourseCacheInfo {
  problems: Record<DocumentElementURI, string[]>;
  lastUpdatedTs_ms: number;
}

// Use global cache to persist between requests in dev/local
const globalCache = global as any;
if (!globalCache.COURSE_CACHE) {
  globalCache.COURSE_CACHE = new Map<string, CourseCacheInfo>();
}
const CACHE: Map<string, CourseCacheInfo> = globalCache.COURSE_CACHE;

function isCacheValid(cache: CourseCacheInfo) {
  const HOURS_6 = 1000 * 60 * 60 * 6;
  return Date.now() - cache.lastUpdatedTs_ms < HOURS_6;
}

export async function getCourseProblemsBySection(courseId: string) {
  const cache = CACHE.get(courseId);
  if (cache && isCacheValid(cache)) return cache.problems;

  const courseInfo = (await getCourseInfo())[courseId];
  if (!courseInfo) return null;
  const { notes } = courseInfo;
  const problems = await fetchProblems(notes);
  CACHE.set(courseId, { problems, lastUpdatedTs_ms: Date.now() });
  return problems;
}

export async function getProblemsBySection(sectionUri: string) {
  for (const courseId of Object.keys(CACHE)) {
    const problems = await getCourseProblemsBySection(courseId);
    if (problems && problems[sectionUri]) return problems[sectionUri];
  }
  const problems = await getProblemsForSection(sectionUri);
  return problems;
}

function collectSectionUris(toc: TOCElem[]): DocumentElementURI[] {
  const result: DocumentElementURI[] = [];
  for (const elem of toc) {
    if (elem.type === 'Section' && elem.uri) result.push(elem.uri);
    if ('children' in elem) result.push(...collectSectionUris(elem.children));
  }
  return result;
}

async function fetchProblems(notesUri: string): Promise<Record<DocumentElementURI, string[]>> {
  const tocContent = (await getDocumentSections(notesUri))[1];
  const sectionUris = collectSectionUris(tocContent);

  const problems: Record<DocumentElementURI, string[]> = {};
  await Promise.all(
    sectionUris.map(async (uri) => {
      problems[uri] = await getProblemsForSection(uri);
    })
  );

  return problems;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const courseId = req.query.courseId as string;
  const problems = await getCourseProblemsBySection(courseId);
  if (!problems) return res.status(404).send(`Course not found: [${courseId}]`);

  const counts = Object.fromEntries(
    Object.entries(problems).map(([uri, problems]) => [uri, problems.length])
  );

  res.status(200).json(counts as Record<DocumentElementURI, number>);
}
