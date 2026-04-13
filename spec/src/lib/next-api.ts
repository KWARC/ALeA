import { FTML } from '@flexiformal/ftml';
import axios from 'axios';
import { SmileyCognitiveValues } from './lmp';

export interface CardsWithSmileys {
  conceptUri: string;
  definitionUri: string;
  smileys: SmileyCognitiveValues;
  chapterTitle: string;
  sectionTitle: string;
}

export interface SectionInfo {
  id: string;
  uri: string;
  level: number /* top level nodes have level 0 */;
  title: string;
  clipId?: string;
  clipInfo?: {
    [slideUri: string]: ClipInfo[];
  };
  timestamp_ms?: number;

  children: SectionInfo[];
}

export enum SlideType {
  FRAME = 'FRAME',
  TEXT = 'TEXT',
}

export interface Slide {
  slideType: SlideType;
  paragraphs?: Extract<FTML.SlideElement, { type: 'Paragraph' }>[];
  slide?: Extract<FTML.SlideElement, { type: 'Slide' }>;
  preNotes: Extract<FTML.SlideElement, { type: 'Paragraph' }>[];
  postNotes: Extract<FTML.SlideElement, { type: 'Paragraph' }>[];
  sectionId: string;
}

export interface ClipDetails {
  r360?: string;
  r720?: string;
  r1080?: string;
  subtitles?: Record<string, string>;
  thumbnailUrl?: string;
  presenterUrl?: string;
  presentationUrl?: string;
  compositeUrl?: string;
}
export interface ClipInfo {
  video_id: string;
  start_time?: number;
  end_time?: number;
}
export type SlidesClipInfo = {
  [sectionId: string]: {
    [slideUri: string]: ClipInfo[];
  };
};
export interface ClipMetadata {
  start_time?: number;
  end_time?: number;
  sectionId?: string;
  sectionTitle?: string;
  sectionUri?: string;
  slideUri?: string;
  slideContent?: string;
  slideHtml?: string;
  ocr_slide_content?: string;
}
export interface SlidesWithCSS {
  slides: Slide[];
  css: FTML.Css[];
}
export interface GetSlidesResponse {
  [sectionId: string]: SlidesWithCSS;
}

// Can use for 'https://alea.education' for faster debugging and/or to get latest server data.
// However, you will need some use CORS unblocker. eg https://chromewebstore.google.com/detail/cors-unblock/lfhmikememgdcahcdlaciloancbhjino
const BASE_SLIDES_DATA_URL = '';

export async function getSlides(
  courseId: string,
  sectionId: string
): Promise<{ slides: Slide[]; css: FTML.Css[] }> {
  const response = await axios.get<GetSlidesResponse>(`${BASE_SLIDES_DATA_URL}/api/get-slides`, {
    params: { courseId, sectionIds: sectionId },
  });
  const sectionData = response.data[sectionId];
  return {
    slides: sectionData?.slides || [],
    css: sectionData?.css || [],
  };
}

export async function getSlideCounts(courseId: string) {
  const response = await axios.get(`${BASE_SLIDES_DATA_URL}/api/get-slide-counts`, {
    params: { courseId },
  });
  return response.data as { [sectionId: string]: number };
}

export async function getSlideUriToIndexMapping(courseId: string) {
  const response = await axios.get(`${BASE_SLIDES_DATA_URL}/api/get-slide-uri-to-index-mapping`, {
    params: { courseId },
  });
  return response.data as { [sectionId: string]: { [slideUri: string]: number } };
}

export async function getSlideDetails(courseId: string, clipId: string) {
  const resp = await axios.get(
    `${BASE_SLIDES_DATA_URL}/api/get-slide-details/${courseId}/${clipId}`
  );
  return resp.data as { [timestampSec: number]: ClipMetadata };
}