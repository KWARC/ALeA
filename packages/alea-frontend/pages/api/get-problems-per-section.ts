import { NextApiRequest, NextApiResponse } from 'next';
import { getAllCoursesFromDb } from './get-all-courses';
import { getCategorizedProblems } from './get-categorized-problem';
import { getExamsForCourse, getProblemsForExam } from '@alea/spec';
import { Language } from '@alea/utils';

function normalizeProblemUri(uri: string) {
  return uri.split('&d=')[0];
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

  for (const exam of exams) {
    const examProblems = await getProblemsForExam(exam.uri);

    for (const problemUri of examProblems) {
      const normalized = normalizeProblemUri(problemUri);

      examOnlyProblemSet.add(normalized);

      const existing = examProblemMap.get(normalized) ?? [];

      existing.push({
        examUri: exam.uri,
        examLabel: exam.number ? `Exam ${exam.number} ${exam.term ?? ''}` : 'Exam',
      });

      examProblemMap.set(normalized, existing);
    }
  }

  const practiceProblemSet = new Set(practiceProblems.map((p) => normalizeProblemUri(p.problemId)));

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
    examRefs: examProblemMap.get(normalizeProblemUri(p.problemId)) ?? [],
  }));

  return res.status(200).json(enrichedProblems);
}
