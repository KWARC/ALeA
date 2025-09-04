import { getCourseInfo } from '@stex-react/spec';
import { CourseInfo } from '@stex-react/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSlidesForCourse } from './get-slides';

export async function getSlideUriToIndexMapping(courseId: string, courseInfo: CourseInfo) {
  const allCourseSlides = await getSlidesForCourse(courseId, courseInfo.notes);
  const uriToIndexMap: { [sectionId: string]: { [slideUri: string]: number } } = {};
  for (const [sectionId, slidesWithCSS] of Object.entries(allCourseSlides)) {
    const sectionMap: { [slideUri: string]: number } = {};
    slidesWithCSS.slides.forEach((slide, index) => {
      if (slide.slide?.uri) {
        sectionMap[slide.slide?.uri] = index;
      }
    });
    uriToIndexMap[sectionId] = sectionMap;
  }

  return uriToIndexMap;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const courseId = req.query.courseId as string;
  const courses = await getCourseInfo();
  const courseInfo = courses[courseId];
  if (!courseInfo) return res.status(404).send('Course not found!');
  const slidesMap = await getSlideUriToIndexMapping(courseId, courseInfo);
  return res.status(200).json(slidesMap);
}
