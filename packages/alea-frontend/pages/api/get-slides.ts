import {
  CSS,
  Slide,
  SlideElement,
  SlideType,
  TOCElem,
  getCourseInfo,
  getDocumentSections,
  getSectionSlides,
} from '@stex-react/api';
import { NextApiRequest, NextApiResponse } from 'next';

const SLIDE_EXPIRY_TIME = 20 * 60 * 1000;
interface SlidesWithCSS {
  slides: Slide[];
  css: CSS[];
}
interface CachedCourseSlides {
  timestamp: number;
  data: { [sectionId: string]: SlidesWithCSS };
}

function mergeIntoAccWithoutDuplicates(acc: CSS[], newCSS: CSS[]) {
  const cssSet = new Set<string>(acc.map((css) => JSON.stringify(css)));
  (newCSS ?? []).forEach((cssItem) => {
    const cssString = JSON.stringify(cssItem);
    if (!cssSet.has(cssString)) {
      cssSet.add(cssString);
      acc.push(cssItem);
    }
  });
}

async function recursivelyExpandSlideElementsExcludeSections(
  slideElems: SlideElement[],
  sectionId: string
): Promise<{ slides: Slide[]; css: CSS[] }> {
  const elems: (Extract<SlideElement, { type: 'Paragraph' | 'Slide' }> | Slide)[] = [];
  const accumulatedCSS: CSS[] = [];

  for (const slideElem of slideElems) {
    if (slideElem.type === 'Inputref') {
      const slidesData = await getSectionSlides(slideElem.uri);
      if (slidesData?.length > 0) {
        const [css, slideElems] = slidesData;
        const result = await recursivelyExpandSlideElementsExcludeSections(slideElems, sectionId);
        elems.push(...result.slides);
        mergeIntoAccWithoutDuplicates(accumulatedCSS, [...css, ...result.css]);
      }
    } else if (slideElem.type === 'Paragraph' || slideElem.type === 'Slide') {
      elems.push(slideElem);
    } else if (slideElem.type === 'Section') {
      continue; // Skip sub-sections
    }
  }

  if (elems.length === 0) return { slides: [], css: accumulatedCSS };

  if (elems.every((e) => 'type' in e && e.type === 'Paragraph')) {
    return {
      slides: [
        {
          slideType: SlideType.TEXT,
          paragraphs: elems,
          preNotes: [],
          postNotes: [],
          sectionId,
        },
      ],
      css: accumulatedCSS,
    };
  }

  const finalSlides: Slide[] = [];
  let inWaitParas: Extract<SlideElement, { type: 'Paragraph' }>[] = [];
  for (const elem of elems) {
    const lastSlide = finalSlides.length > 0 ? finalSlides[finalSlides.length - 1] : undefined;
    if ('slideType' in elem) {
      finalSlides.push(elem);
    } else if (elem.type === 'Slide') {
      const newSlide = {
        slideType: SlideType.FRAME,
        slide: elem,
        preNotes: [],
        postNotes: [],
        sectionId,
      } as Slide;
      if (inWaitParas.length > 0) {
        newSlide.preNotes.push(...inWaitParas);
        inWaitParas = [];
      }
      finalSlides.push(newSlide);
    } else if (lastSlide?.slideType === SlideType.FRAME) {
      lastSlide.postNotes.push(elem);
    } else if (lastSlide?.slideType === SlideType.TEXT) {
      lastSlide.paragraphs.push(elem);
    } else {
      inWaitParas.push(elem);
    }
  }
  if (inWaitParas.length > 0) {
    finalSlides.push({
      slideType: SlideType.TEXT,
      paragraphs: inWaitParas,
      preNotes: [],
      postNotes: [],
      sectionId,
    });
  }
  return { slides: finalSlides, css: accumulatedCSS };
}

async function getSlidesFromToc(elems: TOCElem[], bySection: Record<string, SlidesWithCSS>) {
  for (const elem of elems) {
    if (elem.type === 'Section') {
      const secId = elem.id;
      const slideData = await getSectionSlides(elem.uri);
      if (slideData) {
        const [css, slideElems] = slideData;
        const result = await recursivelyExpandSlideElementsExcludeSections(slideElems, secId);
        mergeIntoAccWithoutDuplicates(css, result.css);

        bySection[secId] = {
          slides: result.slides,
          css,
        };
      }
    }
    if ('children' in elem) {
      await getSlidesFromToc(elem.children, bySection);
    }
  }
}

async function computeSlidesForDoc(notesUri: string) {
  const toc = (await getDocumentSections(notesUri))[1];
  const bySection: { [sectionId: string]: SlidesWithCSS } = {};
  await getSlidesFromToc(toc, bySection);
  return bySection;
}

const globalCache = global as any;
if (!globalCache.G_CACHED_SLIDES) {
  globalCache.G_CACHED_SLIDES = {};
}
const CACHED_SLIDES: {
  [courseId: string]: CachedCourseSlides;
} = globalCache.G_CACHED_SLIDES;

const CACHE_PROMISES = new Map<string, Promise<{ [sectionId: string]: SlidesWithCSS }>>();
async function refreshCache(courseId: string, notesUri: string) {
  if (!CACHE_PROMISES.has(courseId)) {
    const promise = computeSlidesForDoc(notesUri)
      .then((newSlides) => {
        CACHED_SLIDES[courseId] = { data: newSlides, timestamp: Date.now() };
        return newSlides;
      })
      .finally(() => {
        CACHE_PROMISES.delete(courseId);
      });
    CACHE_PROMISES.set(courseId, promise);
  }
  return await CACHE_PROMISES.get(courseId)!;
}
export async function getSlidesForCourse(courseId: string, notesUri: string) {
  const now = Date.now();
  const cacheEntry = CACHED_SLIDES[courseId];
  if (cacheEntry && now - cacheEntry.timestamp < SLIDE_EXPIRY_TIME) {
    return cacheEntry.data;
  }
  if (cacheEntry) {
    refreshCache(courseId, notesUri);
  } else {
    await refreshCache(courseId, notesUri);
  }
  return cacheEntry.data || {};
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const courseId = req.query.courseId as string;
  const sectionIds = req.query.sectionIds as string;
  if (!courseId || !sectionIds) {
    res.status(400).send('Course ID and section IDs are required!');
    return;
  }
  const courses = await getCourseInfo();
  const courseInfo = courses[courseId];
  if (!courseInfo) {
    res.status(404).json({ error: 'Course not found!' });
    return;
  }
  const sectionIdArr = sectionIds.split(',');
  const allCourseSlides = await getSlidesForCourse(courseId, courseInfo.notes);
  const data: { [sectionId: string]: SlidesWithCSS } = {};
  for (const secId of sectionIdArr) {
    data[secId] = allCourseSlides[secId];
  }

  return res.status(200).json(data);
}
