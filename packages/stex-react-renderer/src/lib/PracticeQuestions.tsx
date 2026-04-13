import { FTML } from '@flexiformal/ftml';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { handleViewSource, UriProblemViewer } from './PerSectionQuiz';
import { ListStepper } from './QuizDisplay';
import { getLocaleObject } from './lang/utils';

export function PracticeQuestions({
  problemIds: problemUris,
  showButtonFirst = true,
}: {
  problemIds: string[];
  showButtonFirst?: boolean;
}) {
  const t = getLocaleObject(useRouter()).quiz;
  const [problemIdx, setProblemIdx] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState<boolean[]>([]);
  const [responses, setResponses] = useState<(FTML.ProblemResponse | undefined)[]>([]);

  useEffect(() => {
    setProblemIdx(0);
    setIsSubmitted(problemUris.map(() => false));
    setResponses(problemUris.map(() => undefined));
  }, [problemUris]);

  if (!problemUris.length) return !showButtonFirst ? <i>No problems found.</i> : null;

  const problemUri = problemUris[problemIdx];

  return (
    <Box
      px="10px"
      maxWidth="800px"
      m="auto"
      bgcolor="background.default"
      border="1px solid"
      borderColor="divider"
      borderRadius="5px"
    >
      <Typography fontWeight="bold" textAlign="left" sx={{ pt: 2 }}>
        {t.problem} {problemIdx + 1} {t.of} {problemUris.length}
      </Typography>
      <Box
        display="flex"
        justifyContent={problemUris.length > 1 ? 'space-between' : 'flex-end'}
        mt={1}
      >
        {problemUris.length > 1 && (
          <ListStepper
            idx={problemIdx}
            listSize={problemUris.length}
            onChange={(idx) => {
              setProblemIdx(idx);
            }}
          />
        )}
        <IconButton onClick={() => handleViewSource(problemUri)}>
          <Tooltip title="view source">
            <OpenInNewIcon />
          </Tooltip>
        </IconButton>
      </Box>
      <Box mb={2} mt={1}>
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
    </Box>
  );
}
