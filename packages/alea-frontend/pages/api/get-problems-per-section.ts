import { NextApiRequest, NextApiResponse } from 'next';
import { getAllCoursesFromDb } from './get-all-courses';
import { getCategorizedProblems } from './get-categorized-problem';
import {
  getExamsForCourse,
  getProblemsForExams,
  getProblemsForQuizzes,
  getQuizzesForCourse,
} from '@alea/spec';
import { Language } from '@alea/utils';

const PROBLEM_LIST_CACHE_TTL_MS = 60 * 60 * 1000;

interface CachedProblemList {
  problems: string[];
  lastUpdatedTs_ms: number;
}

const globalCache = global as typeof globalThis & {
  EXAM_QUIZ_PROBLEM_CACHE?: Map<string, CachedProblemList>;
};

if (!globalCache.EXAM_QUIZ_PROBLEM_CACHE) {
  globalCache.EXAM_QUIZ_PROBLEM_CACHE = new Map<string, CachedProblemList>();
}

const PROBLEM_LIST_CACHE = globalCache.EXAM_QUIZ_PROBLEM_CACHE;

function problemListCacheKey(kind: 'exam' | 'quiz', uri: string) {
  return `${kind}:${uri}`;
}

function isProblemListCacheValid(entry: CachedProblemList) {
  return Date.now() - entry.lastUpdatedTs_ms < PROBLEM_LIST_CACHE_TTL_MS;
}

async function getCachedProblemsForResources(
  kind: 'exam' | 'quiz',
  uris: string[],
  fetchAll: (uris: string[]) => Promise<Map<string, string[]>>
): Promise<Map<string, string[]>> {
  const problemsByUri = new Map<string, string[]>();
  const misses: string[] = [];

  for (const uri of uris) {
    const cached = PROBLEM_LIST_CACHE.get(problemListCacheKey(kind, uri));
    if (cached && isProblemListCacheValid(cached)) {
      problemsByUri.set(uri, cached.problems);
    } else {
      misses.push(uri);
    }
  }

  if (!misses.length) return problemsByUri;

  const fetched = await fetchAll(misses);
  const now = Date.now();
  for (const uri of misses) {
    const problems = fetched.get(uri) ?? [];
    PROBLEM_LIST_CACHE.set(problemListCacheKey(kind, uri), {
      problems,
      lastUpdatedTs_ms: now,
    });
    problemsByUri.set(uri, problems);
  }

  return problemsByUri;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sectionUri = req.query.sectionUri as string;
  const courseId = req.query.courseId as string;
  const languages = req.query.languages as string | undefined;

  if (!sectionUri || !courseId) {
    return res.status(422).send('Missing required query param: sectionUri/courseId');
  }

  const courseInfo = await getAllCoursesFromDb();
  const notesUri = courseInfo?.[courseId]?.notes;
  if (!notesUri) return res.status(404).end();

  const practiceProblems = await getCategorizedProblems(
    courseId,
    sectionUri,
    notesUri,
    (languages?.split(',').map((s) => s.trim()) ?? []) as Language[]
  );

  const exams = await getExamsForCourse(courseId);
  const examProblemMap = new Map<string, { examUri: string; examLabel: string }[]>();
  const examOnlyProblemSet = new Set<string>();
  const sectionProblemSet = new Set(practiceProblems.map((p) => p.problemId));
  const examProblemsByUri = await getCachedProblemsForResources(
    'exam',
    exams.map((exam) => exam.uri),
    getProblemsForExams
  );

  for (const exam of exams) {
    const examProblems = examProblemsByUri.get(exam.uri) ?? [];
    for (const problemUri of examProblems) {
      if (!sectionProblemSet.has(problemUri)) continue;

      examOnlyProblemSet.add(problemUri);

      const existing = examProblemMap.get(problemUri) ?? [];
      existing.push({
        examUri: exam.uri,
        examLabel: exam.number ? `Exam ${exam.number} ${exam.term ?? ''}` : 'Exam',
      });

      examProblemMap.set(problemUri, existing);
    }
  }

  const quizzes = await getQuizzesForCourse(courseId);
  const quizProblemMap = new Map<string, { quizUri: string; quizLabel: string }[]>();
  const quizProblemsByUri = await getCachedProblemsForResources(
    'quiz',
    quizzes.map((quiz) => quiz.uri),
    getProblemsForQuizzes
  );

  for (const quiz of quizzes) {
    const quizProblems = quizProblemsByUri.get(quiz.uri) ?? [];
    for (const problemUri of quizProblems) {
      if (!sectionProblemSet.has(problemUri)) continue;

      const existing = quizProblemMap.get(problemUri) ?? [];

      existing.push({
        quizUri: quiz.uri,
        quizLabel: quiz.number ? `Quiz ${quiz.number}` : 'Quiz',
      });

      quizProblemMap.set(problemUri, existing);
    }
  }

  const practiceProblemSet = new Set(practiceProblems.map((p) => p.problemId));

  const examOnlyProblems = Array.from(examOnlyProblemSet)
    .filter((p) => !practiceProblemSet.has(p))
    .map((problemId) => ({
      problemId,
      category: 'exam',
      labels: [],
      showForeignLanguageNotice: false,
    }));

  const allProblems = [...practiceProblems, ...examOnlyProblems];
  const enrichedProblems = allProblems.map((p) => ({
    ...p,
    examRefs: examProblemMap.get(p.problemId) ?? [],
    quizRefs: quizProblemMap.get(p.problemId) ?? [],
  }));

  return res.status(200).json(enrichedProblems);
}
