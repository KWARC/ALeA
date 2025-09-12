import { getFlamsServer } from '@kwarc/ftml-react';
import { FTML } from '@kwarc/ftml-viewer';
import {
  CardsWithSmileys,
  getCourseInfo,
  getDefiniedaInSection,
  getUriSmileys,
} from '@stex-react/spec';

export const EXCLUDED_CHAPTERS = ['Preface', 'Administrativa', 'Resources'];
const CARDS_CACHE: { [courseId: string]: CourseCards } = {};

interface CourseCards {
  [sectionTitle: string]: {
    chapterTitle: string;
    sectionUri: string;
    cardUris: { conceptUri: string; definitionUri: string }[];
  };
}
interface TopLevelSection {
  uri: string;
  chapterTitle: string;
  sectionTitle: string;
}

function getChapterAndSections(toc: FTML.TOCElem, chapterTitle = ''): TopLevelSection[] {
  if (toc.type === 'Paragraph' || toc.type === 'Slide') {
    return [];
  }
  if (toc.type === 'Section' && chapterTitle) {
    return [
      {
        uri: toc.uri,
        chapterTitle: chapterTitle,
        sectionTitle: toc.title,
      },
    ];
  } else {
    if (!chapterTitle && toc.type === 'Section') chapterTitle = toc.title;
    const sections: TopLevelSection[] = [];
    for (const child of toc.children) {
      sections.push(...getChapterAndSections(child, chapterTitle));
    }
    return sections;
  }
}

export async function getCardsBySection(notesUri: string) {
  const tocContent = (await getFlamsServer().contentToc({ uri: notesUri }))?.[1] ?? [];
  const topLevelSections = tocContent.map((toc) => getChapterAndSections(toc)).flat();
  const courseCards: CourseCards = {};
  const cardsBySection = await Promise.all(
    topLevelSections.map(({ uri }) => getDefiniedaInSection(uri))
  );
  topLevelSections.forEach((section, index) => {
    const { chapterTitle, uri, sectionTitle } = section;
    courseCards[sectionTitle] = { chapterTitle, sectionUri: uri, cardUris: cardsBySection[index] };
  });
  return courseCards;
}

export default async function handler(req, res) {
  const { courseId } = req.query;
  const Authorization = req.headers.authorization;
  const courses = await getCourseInfo();
  const courseInfo = courses[courseId];
  if (!courseInfo) {
    res.status(404).json({ error: `Course not found: [${courseId}]` });
    return;
  }

  if (!CARDS_CACHE[courseId]) {
    CARDS_CACHE[courseId] = await getCardsBySection(courseInfo.notes);
  }
  const cards = CARDS_CACHE[courseId];

  const conceptUris: string[] = [];
  for (const chapter of Object.keys(cards)) {
    conceptUris.push(...(cards[chapter]?.cardUris.map((c) => c.conceptUri) || []));
  }
  const smileyValues = Authorization
    ? await getUriSmileys(conceptUris, { Authorization })
    : new Map();

  const output: CardsWithSmileys[] = [];
  for (const sectionTitle of Object.keys(cards)) {
    const { chapterTitle, cardUris } = cards[sectionTitle];
    for (const { conceptUri, definitionUri } of cardUris) {
      const smileys = smileyValues.get(conceptUri) || {};
      output.push({ conceptUri, definitionUri, chapterTitle, sectionTitle, smileys });
    }
  }

  res.status(200).json(output);
}
