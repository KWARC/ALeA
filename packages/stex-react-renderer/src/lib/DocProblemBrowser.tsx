import { FTML } from '@flexiformal/ftml';
import { Box, CircularProgress } from '@mui/material';
import { shouldUseDrawer } from '@alea/utils';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { ContentDashboard } from './ContentDashboard';
import { getLocaleObject } from './lang/utils';
import { LayoutWithFixedMenu } from './LayoutWithFixedMenu';
import { PerSectionQuiz } from './PerSectionQuiz';
import { contentToc } from '@flexiformal/ftml-backend';
import { getCourseProblemCounts } from '@alea/spec';

export function DocProblemBrowser({
  notesDocUri,
  courseId,
  topOffset = 0,
  noFrills = false,
  startSecNameExcl,
  endSecNameIncl,
}: {
  notesDocUri: string;
  courseId?: string;
  startSecNameExcl?: string;
  endSecNameIncl?: string;
  topOffset?: number;
  noFrills?: boolean;
}) {
  const { practiceProblems: t } = getLocaleObject(useRouter());
  const [showDashboard, setShowDashboard] = useState(!shouldUseDrawer());
  const [selectedSection, setSelectedSection] = useState<{ id: string; uri: string }>({
    id: '',
    uri: '',
  });
  const [problemCounts, setProblemCounts] = useState<{ [id: string]: number }>({});
  const [toc, setToc] = useState<FTML.TocElem[]>([]);

  // TODO ALEA4-P1
  //const ancestors = getAncestors(undefined, undefined, selectedSection, docSections);
  // const sectionParentInfo = lastFileNode(ancestors);

  // const coveredSectionIds =
  //   startSecNameExcl && endSecNameIncl
  //     ? getCoveredSections(startSecNameExcl, endSecNameIncl, docSections).coveredSectionIds
  //     : [];
  //   const shortenedDocSections = shortenDocSections(coveredSectionIds, docSections);

  useEffect(() => {
    if (!notesDocUri) return;
    contentToc({ uri: notesDocUri }).then((result) => {
      const toc = result?.[2] ?? [];
      setToc(toc);
    });
  }, [notesDocUri]);

  useEffect(() => {
    if (!courseId) return;

    getCourseProblemCounts(courseId).then((counts) => {
      console.log(counts);
      setProblemCounts(counts);
    });
  }, [courseId, notesDocUri]);
  if (!toc?.length) return <CircularProgress />;

  return (
    <LayoutWithFixedMenu
      menu={
        <ContentDashboard
          key={courseId}
          courseId={courseId}
          toc={toc}
          selectedSection={selectedSection.id}
          onClose={() => setShowDashboard(false)}
          onSectionClick={(sectionId, sectionUri) => {
            setSelectedSection({ id: sectionId, uri: sectionUri });
          }}
          preAdornment={(sectionId) => {
            const numProblems = problemCounts[sectionId];
            if (numProblems === undefined) return <></>;
            return <i>({problemCounts[sectionId] || 'None'})&nbsp;</i>;
          }}
        />
      }
      topOffset={topOffset}
      showDashboard={showDashboard}
      setShowDashboard={setShowDashboard}
      noFrills={noFrills}
    >
      <Box px="10px" bgcolor="background.paper">
        {/*ancestors?.length && (
          <h3>
            <span style={{ color: 'gray' }}>{t.problemsFor}</span> // TODO ALEA4-P1
            // mmtHTMLToReact(ancestors[ancestors.length - 1].title ?? '')
          </h3>
        )}*/}
        {!selectedSection && (
          <>
            <br />
            <i>{t.clickSection}</i>
          </>
        )}
        {selectedSection?.uri && (
          <PerSectionQuiz
            courseId={courseId!}
            sectionUri={selectedSection.uri}
            showButtonFirst={false}
          />
        )}
        <br />
        <b style={{ color: 'red' }}>{t.warning}</b>
      </Box>
    </LayoutWithFixedMenu>
  );
}
