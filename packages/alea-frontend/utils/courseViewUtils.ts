import { NextRouter } from 'next/router';
import { localStore } from '@alea/utils';

export enum ViewMode {
  SLIDE_MODE = 'SLIDE_MODE',
  COMBINED_MODE = 'COMBINED_MODE',
}

export function setSlideNumAndSectionId(router: NextRouter, slideNum: number, sectionId?: string) {
  const { pathname, query } = router;
  const isDynamicRoute = Boolean(query.institutionId && query.instance);
  const courseId = query.courseId as string;
  const slideNumStr = `${slideNum}`;
  if (query.slideNum === slideNumStr && (!sectionId || query.sectionId === sectionId)) {
    return;
  }

  const newQuery = { ...query };
  if (sectionId) {
    newQuery.sectionId = sectionId;
    localStore?.setItem(`lastReadSectionId-${courseId}`, sectionId);
  }
  newQuery.slideNum = slideNumStr;
  localStore?.setItem(`lastReadSlideNum-${courseId}`, slideNumStr);

  if (isDynamicRoute) {
    router.replace({ pathname, query: newQuery }, undefined, { shallow: true });
  } else {
    router.push({ pathname, query: newQuery });
  }
}
