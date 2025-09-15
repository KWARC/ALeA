import { getCourseInfo } from '@alea/spec';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSlidesForCourse } from './get-slides';

export async function getSlideCounts(courseId: string, res: NextApiResponse) {
  const courses = await getCourseInfo();
  const courseInfo = courses[courseId];
  if (!courseInfo) {
    res.status(404).json({ error: 'Course not found!' });
    return;
  }

  const allCourseSlides = await getSlidesForCourse(courseId, courseInfo.notes);
  const data: { [sectionId: string]: number } = {};
  for (const [secId, slidesWithCSS] of Object.entries(allCourseSlides)) {
    data[secId] = slidesWithCSS.slides.length;
  }
  return data;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const courseId = req.query.courseId as string;
  const slideCounts = await getSlideCounts(courseId, res);
  if (slideCounts) {
    return res.status(200).json(slideCounts);
  }
}
