import { Box, Button } from '@mui/material';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { getLocaleObject } from './lang/utils';
import { PerSectionQuiz } from './PerSectionQuiz';

interface PracticeProblemProps {
  sectionUri: string;
  showHideButton?: boolean;
  isAccordionOpen?: boolean;
}

const PracticeProblem: React.FC<PracticeProblemProps> = ({
  sectionUri,
  showHideButton,
  isAccordionOpen,
}) => {
  const [showProblems, setShowProblems] = useState(false);
  const router = useRouter();
  const { quiz: t } = getLocaleObject(router);
  const [cachedProblemUris, setCachedProblemUris] = useState<string[] | null>(null);
  const [tabIndex, setTabIndex] = useState<string>('0');
  const [categoryMap, setCategoryMap] = useState<Record<string, string[]>>({});
  const courseId = router.query.courseId as string;
  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  useEffect(() => {
    if (isAccordionOpen && !hasBeenOpened) {
      setHasBeenOpened(true);
    }
  }, [isAccordionOpen]);

  useEffect(() => {
    if (!sectionUri || !courseId) return;
    setShowProblems(true);
  }, [isAccordionOpen, sectionUri, courseId]);

  // if (isAccordionOpen) {
  //   // could show "no problems" fallback if needed, but PerSectionQuiz already handles empty states
  // }

  return (
    <Box>
      {!showProblems && (
        <Button
          variant="contained"
          color="primary"
          onClick={() => setShowProblems(true)}
          sx={{ mb: 1.25 }}
        >
          {t.practiceProblem}
        </Button>
      )}

      {showProblems && (
        <Box>
          {hasBeenOpened && (
            <Box sx={{ display: isAccordionOpen ? 'block' : 'none' }}>
              <PerSectionQuiz
                sectionUri={sectionUri}
                courseId={courseId}
                cachedProblemUris={cachedProblemUris}
                setCachedProblemUris={setCachedProblemUris}
                showHideButton={false}
                showButtonFirst={false}
                tabIndex={tabIndex}
                setTabIndex={setTabIndex}
                externalCategoryMap={categoryMap}
                setExternalCategoryMap={setCategoryMap}
              />
            </Box>
          )}
          {showHideButton && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => setShowProblems(false)}
              sx={{  mt:1.25 }}
            >
              {t.hidepracticeProblem}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};

export default PracticeProblem;
