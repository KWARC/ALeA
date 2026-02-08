import { getDefiniedaInSectionAgg, getLearningObjects } from '@alea/spec';
import { FTML } from '@flexiformal/ftml';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Button, IconButton, LinearProgress, Tooltip, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getLocaleObject } from './lang/utils';
import { handleViewSource, UriProblemViewer } from './PerSectionQuiz';
import { ProblemFilter } from './ProblemFilter';
import { ListStepper } from './QuizDisplay';

export function ForMe({
  sectionUri,
  showButtonFirst = true,
  showHideButton = false,
  cachedProblemUris,
  setCachedProblemUris,
  setExternalProblemUris,
  disablelayout = false,
}: {
  sectionUri: string;
  showButtonFirst?: boolean;
  showHideButton?: boolean;
  cachedProblemUris: string[] | null;
  setCachedProblemUris: (uris: string[]) => void;
  disablelayout?: boolean;
  setExternalProblemUris?: (uris: string[]) => void;
}) {
  const t = getLocaleObject(useRouter()).quiz;
  const [problemUris, setProblemUris] = useState<string[]>(cachedProblemUris || []);
  const [isLoadingProblemUris, setIsLoadingProblemUris] = useState<boolean>(!cachedProblemUris);
  const [problemIdx, setProblemIdx] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState<boolean[]>([]);
  const [responses, setResponses] = useState<(FTML.ProblemResponse | undefined)[]>([]);
  const [, setShow] = useState(true);
  const [allProblemUris, setAllProblemUris] = useState<string[]>(cachedProblemUris || []);

  useEffect(() => {
    if (cachedProblemUris) return;
    setIsLoadingProblemUris(true);
    const fetchProblemUris = async () => {
      try {
        const data = await getDefiniedaInSectionAgg(sectionUri);
        const URIs = data?.flatMap((item) => item.conceptUri) || [];
        const fetchedResponse = await getLearningObjects(
          URIs,
          100,
          ['problem'],
          undefined,
          { remember: 0.2, understand: 0.2 },
          { remember: 0.85, understand: 0.85 }
        );
        const extractedProblemIds =
          fetchedResponse?.['learning-objects']?.map((lo: any) => lo['learning-object']) || [];

        setProblemUris(extractedProblemIds);
        setAllProblemUris(extractedProblemIds);
        setCachedProblemUris(extractedProblemIds);
        setIsSubmitted(extractedProblemIds.map(() => false));
        setResponses(extractedProblemIds.map(() => undefined));
        setExternalProblemUris?.(extractedProblemIds);
      } catch (error) {
        console.error('Error fetching problem URIs:', error);
      } finally {
        setIsLoadingProblemUris(false);
      }
    };

    fetchProblemUris();
  }, [sectionUri, cachedProblemUris, setCachedProblemUris]);

  useEffect(() => {
    if (!problemUris.length) return;
    setIsSubmitted(problemUris.map(() => false));
    setResponses(problemUris.map(() => undefined));
  }, [problemUris]);

  if (isLoadingProblemUris) return <LinearProgress />;

  const InnerContent = () => (
    <>
      <ProblemFilter
        allProblemUris={allProblemUris}
        onApply={(filtered, type) => {
          setProblemUris(filtered);
          setIsSubmitted(filtered.map(() => false));
          setResponses(filtered.map(() => undefined));
          setProblemIdx(0);
        }}
      />
      {!problemUris.length ? (
        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
          {t.NoPracticeProblemsForMe}
        </Typography>
      ) : (
        (() => {
          const problemUri = problemUris[problemIdx];
          if (!problemUri) {
            console.error('Invalid problemIdx', problemIdx, problemUris);
            return (
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                {t.NoPracticeProblemsForMe}
              </Typography>
            );
          }
          return (
            <>
              <Typography fontWeight="bold" textAlign="left">
                {`${t.problem} ${problemIdx + 1} ${t.of} ${problemUris.length} `}
              </Typography>
              <Box
                px={2}
                maxWidth={800}
                m="auto"
                bgcolor="background.paper"
                border="1px solid "
                borderColor="divider"
                borderRadius={1}
              ></Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <ListStepper
                  idx={problemIdx}
                  listSize={problemUris.length}
                  onChange={(idx) => {
                    setProblemIdx(idx);
                  }}
                />
                <IconButton onClick={() => handleViewSource(problemUri)} sx={{ float: 'right' }}>
                  <Tooltip title="view source">
                    <OpenInNewIcon />
                  </Tooltip>
                </IconButton>
              </Box>
              <Box mb={1.25}>
                <UriProblemViewer
                  key={problemUri}
                  uri={problemUri}
                  isSubmitted={isSubmitted[problemIdx]}
                  setIsSubmitted={(v) =>
                    setIsSubmitted((prev) => {
                      prev[problemIdx] = v;
                      return [...prev];
                    })
                  }
                  response={responses[problemIdx]}
                  setResponse={(v) =>
                    setResponses((prev) => {
                      prev[problemIdx] = v;
                      return [...prev];
                    })
                  }
                />
              </Box>
              <Box
                mb={2}
                sx={{
                  display: 'flex',
                  gap: 1.25,
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                {showHideButton && (
                  <Button onClick={() => setShow(false)} variant="contained" color="secondary">
                    {t.hideProblems}
                  </Button>
                )}
              </Box>
            </>
          );
        })()
      )}
    </>
  );

  return disablelayout ? (
    InnerContent()
  ) : (
    <Box
      px={2}
      maxWidth={800}
      m="auto"
      bgcolor="background.paper"
      border="1px solid "
      borderColor="divider"
      borderRadius={1}
    >
      {InnerContent()}
    </Box>
  );
}
