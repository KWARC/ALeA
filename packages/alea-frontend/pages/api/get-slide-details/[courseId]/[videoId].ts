import { NextApiRequest, NextApiResponse } from 'next';
import {
  CACHED_VIDEO_SLIDESMAP,
  populateVideoToSlidesMap,
} from '../../get-section-info/[courseId]';
import { getCurrentTermForCourseId } from '@alea/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { courseId, videoId } = req.query;
  if (!courseId || !videoId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  if (!CACHED_VIDEO_SLIDESMAP[courseId as string]) {
    await populateVideoToSlidesMap();
  }

  const courseCache = CACHED_VIDEO_SLIDESMAP[courseId as string];
  if (!courseCache) return res.status(404).send( 'Course not found' );
  const semesters = Object.keys(courseCache);
  const currentTerm = await getCurrentTermForCourseId(courseId as string);
  const semesterKey = (currentTerm && courseCache[currentTerm]) ? currentTerm : semesters[0];
  const videoData = courseCache[semesterKey]?.[videoId as string];
  if (!videoData?.extracted_content) return res.status(404).send('Video data not found');

  return res.status(200).json(videoData.extracted_content);
}