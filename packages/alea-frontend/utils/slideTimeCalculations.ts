import { ClipInfo } from '@alea/spec';
import { SlidesUriToIndexMap } from '../components/VideoDisplay';

export interface SlideClipRange {
  start: number;
  end: number;
}

export const calculateCurrentSlideClipRange = (
  currentSlideUri: string | undefined,
  currentSectionId: string | undefined,
  slidesClipInfo:
    | {
        [sectionId: string]: {
          [slideUri: string]: ClipInfo[];
        };
      }
    | undefined,
  clipId: string | undefined
): SlideClipRange | null => {
  if (!currentSlideUri || !currentSectionId || !slidesClipInfo || !clipId) return null;

  const slideClips = slidesClipInfo[currentSectionId]?.[currentSlideUri];
  if (!slideClips || !Array.isArray(slideClips) || slideClips.length === 0) return null;

  const matchingClip = slideClips.find((clip: ClipInfo) => clip.video_id === clipId);
  if (
    !matchingClip ||
    matchingClip.start_time === undefined ||
    matchingClip.end_time === undefined
  ) {
    return null;
  }

  return {
    start: matchingClip.start_time,
    end: matchingClip.end_time,
  };
};

export const calculateSelectedSectionFirstSlideTime = (
  currentSectionId: string | undefined,
  slidesClipInfo:
    | {
        [sectionId: string]: {
          [slideUri: string]: ClipInfo[];
        };
      }
    | undefined,
  slidesUriToIndexMap: SlidesUriToIndexMap | undefined,
  clipId: string | undefined
): number | null => {
  if (!currentSectionId || !slidesClipInfo || !slidesUriToIndexMap) return null;

  const sectionSlides = slidesUriToIndexMap[currentSectionId];
  if (!sectionSlides || Object.keys(sectionSlides).length === 0) return null;
  const firstSlideUri =
    Object.keys(sectionSlides).find((slideUri) => sectionSlides[slideUri] === 0) ||
    Object.keys(sectionSlides)[0];

  if (!firstSlideUri || !slidesClipInfo[currentSectionId]?.[firstSlideUri]) return null;

  const slideClips = slidesClipInfo[currentSectionId][firstSlideUri];
  if (!Array.isArray(slideClips) || slideClips.length === 0) return null;
  const matchingClip = clipId
    ? slideClips.find((clip: ClipInfo) => clip.video_id === clipId)
    : null;
  const clipToUse = matchingClip || slideClips[0];

  return clipToUse.start_time !== undefined ? clipToUse.start_time : null;
};
