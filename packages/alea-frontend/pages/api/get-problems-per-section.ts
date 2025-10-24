import { getCourseInfo } from '@alea/spec';
import { NextApiRequest, NextApiResponse } from 'next';
import { getCategorizedProblems } from './get-categorized-problem';
import { Language } from '@alea/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sectionUri = req.query.sectionUri as string;
  const courseId = req.query.courseId as string;
  const languages = req.query.languages as string | undefined;

  if (!sectionUri || !courseId) {
    return res.status(422).send('Missing required query param: sectionUri/courseId');
  }

  const courseInfo = await getCourseInfo();
  const notesUri = courseInfo?.[courseId]?.notes;
  if (!notesUri) return res.status(404).end();

  const problems = await getCategorizedProblems(
    courseId,
    sectionUri,
    notesUri,
    (languages?.split(',').map((s) => s.trim()) ?? []) as Language[]
  );
  res.status(200).json(problems);
}
