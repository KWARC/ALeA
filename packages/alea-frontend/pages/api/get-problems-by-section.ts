import { NextApiRequest, NextApiResponse } from 'next';
import { getCategorizedProblems } from './get-categorized-problem';
import { getCourseInfo, getDocumentSections } from '@stex-react/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sectionUri = req.query.sectionUri as string;
  const courseId = req.query.courseId as string;

  if (!sectionUri || !courseId) {
    return res.status(422).send('Missing required query params: sectionUri or courseId');
  }

  const courseInfo = await getCourseInfo();
  const notesUri = courseInfo?.[courseId]?.notes;
  if (!notesUri) {
    return res.status(404).end();
  }

  const [, toc] = await getDocumentSections(notesUri);
  const problems = await getCategorizedProblems(sectionUri, toc);

  res.status(200).json(problems);
}
