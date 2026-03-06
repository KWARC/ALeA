import { NextApiRequest, NextApiResponse } from 'next';
import { getAllCoursesFromDb } from './get-all-courses';
import { getCategorizedProblems } from './get-categorized-problem';
import { getExamsForCourse, getProblemsForExam } from '@alea/spec';
import { Language } from '@alea/utils';

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

  for (const exam of exams) {
    const examProblems = await getProblemsForExam(exam.uri);

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
  }));

  return res.status(200).json(enrichedProblems);
}
