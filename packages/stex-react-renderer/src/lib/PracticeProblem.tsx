import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Box, Button, Tab, Tabs, Typography } from '@mui/material';
import { PRIMARY_COL, SECONDARY_COL } from '@stex-react/utils';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { ForMe } from './ForMe';
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
  const [tabValue, setTabValue] = useState(0);

  // Caching states
  const [perSectionProblemUris, setPerSectionProblemUris] = useState<string[] | null>(null);
  const [formeProblemUris, setFormeProblemUris] = useState<string[] | null>(null);

  const handleTabChange = React.useCallback((event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  const [forMeTabLabel, setForMeTabLabel] = useState(t.ForMe.replace('$1', '...'));
  const [perSectionTabLabel, setPerSectionTabLabel] = useState(
    t.perSectionQuizButton.replace('$1', '...')
  );

  useEffect(() => {
    if (!sectionUri) return;
    setPerSectionProblemUris(null);
    setFormeProblemUris(null);
    setForMeTabLabel(t.ForMe.replace('$1', '...'));
    setPerSectionTabLabel(t.perSectionQuizButton.replace('$1', '...'));
  }, [sectionUri]);

  useEffect(() => {
    if (formeProblemUris?.length) {
      setForMeTabLabel(t.ForMe.replace('$1', formeProblemUris.length.toString()));
    }
    if (perSectionProblemUris?.length) {
      setPerSectionTabLabel(
        t.perSectionQuizButton.replace('$1', perSectionProblemUris.length.toString())
      );
    }
  }, [formeProblemUris, perSectionProblemUris, t.ForMe, t.perSectionQuizButton]);

  useEffect(() => {
    if (isAccordionOpen) {
      if (!sectionUri) return;
      setShowProblems(true);
      setTabValue(0);
      setTimeout(() => setTabValue(1), 0);
    }
  }, [isAccordionOpen, sectionUri]);

  if (isAccordionOpen) {
    if (formeProblemUris?.length === 0 && perSectionProblemUris?.length === 0) {
      return (
        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 2 }}>
          No practice problems available
        </Typography>
      );
    }
  }

  return (
    <Box>
      {!showProblems && (
        <Button
          variant="contained"
          color="primary"
          onClick={() => setShowProblems(true)}
          sx={{ marginBottom: '10px' }}
        >
          {t.practiceProblem}
        </Button>
      )}

      {showProblems && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              sx={{
                minHeight: '48px',
                '& .MuiTabs-indicator': {
                  display: 'none',
                },
                '& .MuiTab-root': {
                  minHeight: '48px',
                  paddingX: 3,
                  textTransform: 'none',
                  color: 'rgb(134, 131, 131)',
                  fontSize: '15px',
                  fontWeight: 500,
                  borderRadius: '4px 4px 0 0',
                  marginRight: '4px',
                  backgroundColor: 'transparent',
                  position: 'relative',
                  top: '1px',
                  zIndex: 1,
                  '&:hover': {
                    backgroundColor: SECONDARY_COL,
                  },
                },
                '& .Mui-selected': {
                  color: PRIMARY_COL,
                  fontWeight: 600,
                  backgroundColor: 'rgba(0, 83, 138, 0.04)',
                  borderLeft: '1px solid #203360',
                  borderRight: '1px solid #203360',
                  borderTop: '1px solid #203360',
                  borderBottom: 'none',
                  zIndex: 2,
                },
              }}
            >
              <Tab label={forMeTabLabel} />
              <Tab label={perSectionTabLabel} />
            </Tabs>
            <VisibilityOffIcon
              onClick={() => setShowProblems(false)}
              sx={{ cursor: 'pointer', ml: 2, color: 'gray' }}
              titleAccess={t.hidepracticeProblem}
            />
          </Box>
          {tabValue === 0 && (
            <Box mb={2}>
              <ForMe
                sectionUri={sectionUri}
                showHideButton={false}
                showButtonFirst={false}
                cachedProblemUris={formeProblemUris}
                setCachedProblemUris={setFormeProblemUris}
              />
            </Box>
          )}

          {tabValue === 1 && (
            <Box mb={2}>
              <PerSectionQuiz
                sectionUri={sectionUri}
                showHideButton={false}
                showButtonFirst={false}
                cachedProblemUris={perSectionProblemUris}
                setCachedProblemUris={setPerSectionProblemUris}
              />
            </Box>
          )}

          <Button
            variant="contained"
            color="primary"
            onClick={() => setShowProblems(false)}
            sx={{ marginTop: '10px' }}
          >
            {t.hidepracticeProblem}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default PracticeProblem;
