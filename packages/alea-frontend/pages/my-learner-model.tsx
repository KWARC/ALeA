import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Snackbar,
  Tooltip,
} from '@mui/material';
import { ConceptCompetenceInfo, getMyCompleteModel } from '@alea/spec';
import { CompetencyTable } from '@alea/stex-react-renderer';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getLocaleObject } from '../lang/utils';
import MainLayout from '../layouts/MainLayout';


const MyLearnerModelPage: NextPage = () => {
  const router = useRouter();
  const { myLearnerModel: t } = getLocaleObject(router);
  const [isLoading, setIsLoading] = useState(false);
  const [competenceInfo, setCompetenceInfo] = useState<ConceptCompetenceInfo[]>(
    []
  );
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  function refresh() {
    setIsLoading(true);

    getMyCompleteModel().then((model) => {
      setIsLoading(false);
      setCompetenceInfo(model);
    });
  }

  useEffect(() => {
    refresh();
  }, []);

  const plainCompetencyData =
    competenceInfo.map((data) => data.competences) || [];
  const concepts = competenceInfo.map((v) => v.concept);

  return (
    <MainLayout title="My Learner Model | ALeA">
      <Box p="10px" m="0 auto" maxWidth="800px">
        {isLoading ? (
          <CircularProgress />
        ) : (
          <Box>
            <h1>{t.learnerModel}</h1>
            <span style={{ color: '#333' }}>
              {t.description1}
              {' ['}
              <Tooltip
                title={
                  <>
                    <span>Fuller et al. (2007)</span>
                    <span>
                      Developing a computer science-specific learning taxonomy.
                    </span>
                    <span>
                      ACM SIGCSE Bulletin. 39. 152-170. 10.1145/1345375.1345438.
                    </span>
                  </>
                }
              >
                <a
                  href="https://dl.acm.org/doi/10.1145/1345375.1345438"
                  style={{ cursor: 'pointer' }}
                  target="_blank"
                  rel="noreferrer"
                >
                  <i>Fuller et. al.</i>
                </a>
              </Tooltip>
              {']'}
              {t.description2}
            </span>
            <br />
            <IconButton onClick={() => refresh()}>
              <RefreshIcon />
            </IconButton>

            {competenceInfo.length ? (
              <CompetencyTable
                conceptUris={concepts}
                competencyData={plainCompetencyData}
                onValueUpdate={() => setSnackbarOpen(true)}
                fetchProblem={false}
              />
            ) : null}
          </Box>
        )}
      </Box>
      <Snackbar
        open={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        message="To see updates, click on refresh"
        action={
          <Button
            color="secondary"
            size="small"
            onClick={() => {
              setSnackbarOpen(false);
              refresh();
            }}
          >
            REFRESH
          </Button>
        }
      />
    </MainLayout>
  );
};

export default MyLearnerModelPage;
