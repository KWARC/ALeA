import { FTML } from '@kwarc/ftml-viewer';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Button, IconButton, LinearProgress, Tooltip, Typography } from '@mui/material';
import { getDefiniedaInSection, getLearningObjects, getSourceUrl } from '@stex-react/api';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getLocaleObject } from './lang/utils';
import { UriProblemViewer } from './PerSectionQuiz';
import { ListStepper } from './QuizDisplay';

export function ForMe({
  sectionUri,
  showButtonFirst = true,
  showHideButton = false,
  cachedProblemUris,
  setCachedProblemUris,
}: {
  sectionUri: string;
  showButtonFirst?: boolean;
  showHideButton?: boolean;
  cachedProblemUris: string[] | null;
  setCachedProblemUris: (uris: string[]) => void;
}) {
  const t = getLocaleObject(useRouter()).quiz;
  const [problemUris, setProblemUris] = useState<string[]>(cachedProblemUris || []);
  const [isLoadingProblemUris, setIsLoadingProblemUris] = useState<boolean>(!cachedProblemUris);
  const [problemIdx, setProblemIdx] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState<boolean[]>([]);
  const [responses, setResponses] = useState<(FTML.ProblemResponse | undefined)[]>([]);
  const [, setShow] = useState(true);

  useEffect(() => {
    if (cachedProblemUris) return;
    setIsLoadingProblemUris(true);
    const fetchProblemUris = async () => {
      try {
        const data = await getDefiniedaInSection(sectionUri);
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
        setCachedProblemUris(extractedProblemIds);
        setIsSubmitted(extractedProblemIds.map(() => false));
        setResponses(extractedProblemIds.map(() => undefined));
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

  const handleViewSource = (uri: string) => {
    getSourceUrl(uri).then((sourceLink) => {
      if (sourceLink) window.open(sourceLink, '_blank');
    });
  };

  if (isLoadingProblemUris) return <LinearProgress />;
  if (!problemUris.length) {
    return (
      <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
        {t.NoPracticeProblemsForMe}
      </Typography>
    );
  }

  const problemUri = problemUris[problemIdx];
  if (!problemUri) return <>error: [{problemUri}] </>;

  return (
    <Box
      px={1}
      maxWidth="800px"
      m="auto"
      bgcolor="white"
      border="1px solid #CCC"
      borderRadius="5px"
    >
      <Typography fontWeight="bold" textAlign="left">
        {`${t.problem} ${problemIdx + 1} ${t.of} ${problemUris.length} `}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
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
      <Box mb="10px">
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
        sx={{ display: 'flex', gap: '10px', flexDirection: 'column', alignItems: 'flex-start' }}
      >
        {showHideButton && (
          <Button onClick={() => setShow(false)} variant="contained" color="secondary">
            {t.hideProblems}
          </Button>
        )}
      </Box>
    </Box>
  );
}
