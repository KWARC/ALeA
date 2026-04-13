import { SafeFTMLFragment } from './SafeFTMLComponents';
import TimelineIcon from '@mui/icons-material/Timeline';
import { Box, Button, Link, Typography } from '@mui/material';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Tooltip from '@mui/material/Tooltip';
import {
  BloomDimension,
  GenericCognitiveValues,
  NumericCognitiveValues,
  SHOW_DIMENSIONS,
  conceptUriToName,
  getFTMLForConceptView,
  getProblemsForConcept,
  uriWeightToSmileyLevel,
} from '@alea/spec';
import { PathToTour, PathToTour2 } from '@alea/utils';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import ConceptHistoryTable from './ConceptHistoryTable';
import { PracticeQuestions } from './PracticeQuestions';
import { SelfAssessmentDialogRow } from './SelfAssessmentDialog';
import { getLocaleObject } from './lang/utils';

const extractLastWordAfterQuestionMark = (url: string) => {
  if (!url) return url;
  const parts = url.split('?');
  return parts[parts.length - 1];
};

function QuizIconWithProblemsCount({ problemIds }: { problemIds: string[] }) {
  return (
    <Box sx={{ display: 'flex', position: 'relative' }}>
      <Box
        sx={{
          position: 'absolute',
          top: '-5px',
          right: '-14px',
          padding: '2px 6px 1px',
          backgroundColor: 'firebrick',
          color: 'white',
          borderRadius: '50%',
          zIndex: 1,
          fontSize: '10px',
        }}
      >
        {problemIds.length}
      </Box>

      <Image src="/practice_problems.svg" width={24} height={24} alt="" />
    </Box>
  );
}

function QuizButton({ uri }: { uri: string }) {
  const [problemList, setProblemList] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  useEffect(() => {
    getProblemsForConcept(uri).then(setProblemList);
  }, [uri]);
  if (problemList.length === 0) {
    return null;
  }
  function handleCloseDialog() {
    setDialogOpen(false);
  }
  return (
    <>
      <Box sx={{ position: 'relative' }}>
        <Box
          sx={{
            position: 'absolute',
            top: '-2px',
            right: '-8px',
            backgroundColor: 'firebrick',
            color: 'text.primary',
            borderRadius: '50%',
            padding: '2px 6px 1px',
            fontSize: '10px',
            zIndex: 1,
          }}
        >
          {problemList.length}
        </Box>
        <Box
          sx={{
            cursor: 'pointer',
            backgroundColor: 'primary.main',
            color: 'text.primary',
            borderRadius: '50%',
            padding: '7px 8px 3px',
          }}
          onClick={() => setDialogOpen(true)}
        >
          <Image src="/practice_problems.svg" width={24} height={24} alt="" />
        </Box>
      </Box>
      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth={true} maxWidth="md">
        <DialogTitle>Practice Problems</DialogTitle>
        <DialogContent>
          <PracticeQuestions problemIds={problemList} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function ConceptView({ uri }: { uri: string }) {
  const html = getFTMLForConceptView(uri);
  return <SafeFTMLFragment key={uri} fragment={{ type: 'HtmlString', html, uri: undefined }} />;
}

export function CompetencyTable({
  conceptUris,
  competencyData,
  onValueUpdate,
  showTour,
  defaultSort,
  fetchProblem = true,
}: {
  conceptUris: string[];
  competencyData: (NumericCognitiveValues | GenericCognitiveValues)[];
  onValueUpdate?: () => void;
  showTour?: boolean;
  defaultSort?: boolean;
  fetchProblem?: boolean;
}) {
  const t = getLocaleObject(useRouter());
  //const [orderBy, setOrderBy] = useState<string>(defaultSort ? 'Understand' : '');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [showAllQuizzes, setShowAllQuizes] = useState<boolean>(false);
  const [problemIds, setProblemIds] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [concept, setConcept] = useState<string>('');
  const combinedData: {
    conceptUri: string;
    values: NumericCognitiveValues | GenericCognitiveValues;
  }[] = useMemo(() => {
    const data = [];
    for (let i = 0; i < conceptUris.length; i++) {
      data.push({
        conceptUri: conceptUris[i],
        values: competencyData[i],
      });
    }
    return data;
  }, [conceptUris, competencyData]);

  const CONCEPT_COLUMN = 'concepts';

  useEffect(() => {
    async function fetchProblemIds() {
      try {
        if (!fetchProblem) return;
        const promises = conceptUris.map((uri) => getProblemsForConcept(uri));
        const results = await Promise.all(promises);
        const flattenedProblemIds = results.flat();
        setProblemIds(flattenedProblemIds);
      } catch (error) {
        console.error('Error fetching problem IDs:', error);
      }
    }
    fetchProblemIds();
  }, [conceptUris, fetchProblem]);

  const handleCloseDialog = () => {
    setShowHistory(false);
  };

  function handleHistoryClick(concept: string) {
    setShowHistory(true);
    setConcept(concept);
  }

  function handleAllQuizzes() {
    setShowAllQuizes(!showAllQuizzes);
  }

  if (!conceptUris?.length || !competencyData?.length) return <p>Loading data... </p>;
  /*const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };*/
  /*const sortedData = combinedData.slice().sort((a, b) => {
    if (orderBy === CONCEPT_COLUMN) {
      const aValue = extractLastWordAfterQuestionMark(a.concepts).toLowerCase();
      const bValue = extractLastWordAfterQuestionMark(b.concepts).toLowerCase();
      return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    } else {
      const aValue = a.values[orderBy];
      const bValue = b.values[orderBy];

      if (order === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    }
  })*/ return (
    <>
      {showTour && (
        <Button variant="contained" onClick={handleAllQuizzes} sx={{ marginBottom: '10px' }}>
          {showAllQuizzes ? (
            t.practiceProblems.closeAllPracticeProblems
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography>{t.practiceProblems.showAllPracticeProblems}</Typography>&nbsp;
              <QuizIconWithProblemsCount problemIds={problemIds} />
            </Box>
          )}
        </Button>
      )}
      {showAllQuizzes && <PracticeQuestions problemIds={problemIds} />}
      <TableContainer component={Paper}>
        <Table sx={{ textAlign: 'center' }}>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  //active={orderBy === CONCEPT_COLUMN}
                  direction={order}
                  //onClick={() => handleRequestSort(CONCEPT_COLUMN)}
                >
                  <b>{t.concepts}</b>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <b>History</b>
              </TableCell>
              {SHOW_DIMENSIONS.map((header) => (
                <TableCell key={header}>
                  <TableSortLabel
                    //active={orderBy === header}
                    direction={order}
                    //onClick={() => handleRequestSort(header)}
                  >
                    <b>{header}</b>
                  </TableSortLabel>
                </TableCell>
              ))}
              {showTour && (
                <TableCell>
                  <b>Resources</b>
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {combinedData.map((row, index) => (
              <TableRow key={index}>
                <TableCell>
                  <ConceptView uri={row.conceptUri} />
                </TableCell>
                <TableCell>
                  <Tooltip
                    title="View how you reached the current competency level"
                    placement="right-start"
                  >
                    <TimelineIcon
                      onClick={() => handleHistoryClick(row.conceptUri)}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Tooltip>
                </TableCell>
                {SHOW_DIMENSIONS.map((dimension: BloomDimension) => (
                  <TableCell key={dimension}>
                    <Tooltip
                      title={
                        <SelfAssessmentDialogRow
                          htmlName={extractLastWordAfterQuestionMark(conceptUris[index])}
                          dim={dimension}
                          uri={conceptUris[index]}
                          dimText={false}
                          selectedLevel={uriWeightToSmileyLevel(Number(row.values[dimension]))}
                          onValueUpdate={onValueUpdate}
                          eventType="edit-5StepLikertSmileys"
                        />
                      }
                    >
                      <span style={{ cursor: 'pointer' }}>
                        {Number(row.values[dimension]).toFixed(2)}
                      </span>
                    </Tooltip>
                  </TableCell>
                ))}
                {showTour && (
                  <TableCell
                    sx={{
                      padding: '4px',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Link
                      href={PathToTour(conceptUris[index])}
                      target="_blank"
                      sx={{ marginRight: '10px' }}
                    >
                      <Image
                        src="/guidedTour.png"
                        alt="Tour Logo"
                        width={40}
                        height={40}
                        style={{ cursor: 'pointer' }}
                        priority={true}
                      />
                    </Link>{' '}
                    <Link
                      href={PathToTour2(conceptUris[index])}
                      target="_blank"
                      sx={{ marginRight: '10px' }}
                    >
                      <Image
                        src="/conversationalGuidedTour.png"
                        alt="Tour Logo"
                        width={40}
                        height={40}
                        style={{ cursor: 'pointer' }}
                        priority={true}
                      />
                    </Link>
                    <QuizButton uri={conceptUris[index]} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <ConceptHistoryTable open={showHistory} onClose={handleCloseDialog} concept={concept} />
    </>
  );
}

export default CompetencyTable;
