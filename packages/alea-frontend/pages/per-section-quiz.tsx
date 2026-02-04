import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { SafeHtml } from '@alea/react-utils';
import { PerSectionQuiz } from '@alea/stex-react-renderer';
import { getParamFromUri } from '@alea/utils';
import { useRouter } from 'next/router';
import React from 'react';
import { getLocaleObject } from '../lang/utils';
import MainLayout from '../layouts/MainLayout';

const PerSectionQuizPage: React.FC = () => {
  const router = useRouter();
  const { perSectionQuiz: t } = getLocaleObject(router);

  const sectionUri = router.query.sectionUri as string;
  const sectionTitle = router.query.sectionTitle as string;
  const courseId = router.query.courseId as string;

  if (!sectionUri) return <div>Invalid URL: sectionUri is undefined</div>;
  if (!courseId) return <div>Invalid URL: courseId is undefined</div>;

  const goToAllPracticeProblems = () => {
    router.push(`/practice-problems/${courseId}`);
  };

  const header = sectionTitle ? sectionTitle : getParamFromUri(sectionUri, 'd');

  return (
    <MainLayout title="PerSection Problems | ALeA">
      <Box px="10px" bgcolor="background.paper" maxWidth="800px" m="0 auto">
        <Box display="flex" mt="10px" gap="10px" alignItems="center" my={2}>
          {courseId && (
            <Tooltip title={t.backToAllCourseProblems}>
              <IconButton onClick={goToAllPracticeProblems}>
                <ArrowBackIcon />
              </IconButton>
            </Tooltip>
          )}

          <Typography
            component="span"
            sx={(theme) => ({
              color: 'text.secondary',
              fontSize: 24,
              fontWeight: 700,
            })}
          >
            {t.problemsFor}&nbsp;
            <Typography
              component="span"
              sx={{
                color: 'primary.500',
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              {header ? <SafeHtml html={header} /> : <i>Section</i>} ({courseId.toUpperCase()})
            </Typography>
          </Typography>
        </Box>
        <PerSectionQuiz courseId={courseId} sectionUri={sectionUri} showButtonFirst={false} />
        <br />
        <Box textAlign="left" mx="auto" mt="20px">
          <b style={{ color: 'red' }}>{t.warning}&nbsp;</b>
        </Box>
      </Box>
    </MainLayout>
  );
};

export default PerSectionQuizPage;
