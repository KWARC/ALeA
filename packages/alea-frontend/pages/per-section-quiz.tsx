import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, IconButton, Tooltip } from '@mui/material';
import { SafeHtml } from '@alea/react-utils';
import { PerSectionQuiz } from '@alea/stex-react-renderer';
import { getParamFromUri, PRIMARY_COL } from '@alea/utils';
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

  const goToAllPracticeProblems = () => {
    router.push(`/practice-problems/${courseId}`);
  };

  const header = sectionTitle ? sectionTitle : getParamFromUri(sectionUri, 'd');

  return (
    <MainLayout title="PerSection Problems | ALeA">
      <Box px="10px" bgcolor="white" maxWidth="800px" m="0 auto">
        <Box display="flex" mt="10px" gap="10px" alignItems="center" my={2}>
          {courseId && (
            <Tooltip title={t.backToAllCourseProblems}>
              <IconButton onClick={goToAllPracticeProblems}>
                <ArrowBackIcon />
              </IconButton>
            </Tooltip>
          )}

          <b style={{ color: 'gray', fontSize: '1.5rem', fontWeight: 'bold' }}>
            {t.problemsFor}&nbsp;
            <span
              style={{
                color: PRIMARY_COL,
                fontSize: '1.5rem',
                fontWeight: 'bold',
              }}
            >
              {header ? <SafeHtml html={header} /> : '<i>Section</i>'} ({courseId.toUpperCase()})
            </span>
          </b>
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
