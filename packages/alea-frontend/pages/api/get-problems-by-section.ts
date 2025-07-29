import { NextApiRequest, NextApiResponse } from 'next';
import { getCategorizedProblems } from './get-categorized-problem';
import { getCourseInfo } from '@stex-react/api';
import { getFlamsServer } from '@kwarc/ftml-react';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sectionUri = req.query.sectionUri as string;
  const courseId = req.query.courseId as string | undefined;

  if (!sectionUri) {
    return res.status(422).send('Missing required query param: sectionUri');
  }

  let toc = [];

  if (courseId) {
    const courseInfo = await getCourseInfo();
    const notesUri = courseInfo?.[courseId]?.notes;
    if (!notesUri) {
      return res.status(404).end();
    }
    toc = (await getFlamsServer().contentToc({ uri: notesUri }))?.[1] ?? [];
  }

  const problems = await getCategorizedProblems(sectionUri, toc);
  res.status(200).json(problems);
}
