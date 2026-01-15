import { NextRouter } from 'next/router';
import { localStore } from '@alea/utils';

export enum ViewMode {
  SLIDE_MODE = 'SLIDE_MODE',
  COMBINED_MODE = 'COMBINED_MODE',
}

export function setSlideNumAndSectionId(
  router: NextRouter,
  slideNum: number,
  sectionId?: string
) {
  const institutionId = router.query.institutionId as string;
  const courseId = router.query.courseId as string;
  const instance = router.query.instance as string;
  
  if (!institutionId || !courseId || !instance) {
    console.error('Missing route parameters for setSlideNumAndSectionId');
    return;
  }
  
  const query: any = {
    institutionId,
    courseId,
    instance,
  };
  if (sectionId) {
    query.sectionId = sectionId;
    localStore?.setItem(`lastReadSectionId-${courseId}`, sectionId);
  }
  query.slideNum = `${slideNum}`;
  localStore?.setItem(`lastReadSlideNum-${courseId}`, `${slideNum}`);
  router.push({
    pathname: `/${institutionId}/${courseId}/${instance}/course-view`,
    query,
  });
}
