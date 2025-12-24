import { MdLatex } from './md-latex';
import { Fragment } from 'react';

export function getPartialLatexSections(query: string): { text: string; isLatex: boolean }[] {
  if (!query) return [];
  const sections = [];
  let opened = false;
  let lastLocation = 0;
  for (let i = 0; i < query.length; i++) {
    if (query[i] === '$') {
      const text = query.substring(lastLocation, i);
      if (text.trim().length > 0) {
        sections.push({ text, isLatex: opened });
      }
      lastLocation = i + 1;
      opened = !opened;
    }
  }

  const endText = query.substring(lastLocation).trim();
  if (endText.length > 0) sections.push({ text: endText, isLatex: opened });
  return sections;
}

export function MdPartialLatex({ input }: { input: string }) {
  const sections = getPartialLatexSections(input);

  return (
    <>
      {sections.map((section) =>
        section.isLatex ? (
          <Fragment key={section.text}>
            <MdLatex latex={section.text} />
            &nbsp;
          </Fragment>
        ) : (
          <span key={section.text}>{section.text}</span>
        )
      )}
    </>
  );
}
