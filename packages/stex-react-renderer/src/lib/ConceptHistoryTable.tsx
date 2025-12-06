import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Link,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { BloomDimension, ConceptHistory, getConceptHistory, HistoryItem } from '@alea/spec';
import { useEffect, useState } from 'react';
import { Chart } from 'react-google-charts';
import { ConceptView } from './CompetencyTable';

const eventTypeMapping: { [key: string]: string } = {
  'course-init': 'Previous Course Data',
  'self-assessment': 'Self Assessment',
  'self-assessment-5StepLikertSmileys': 'Self Assessment (Smileys)',
  purge: 'Purge',
  'i-know': 'I Know',
  'problem-answer': 'Problem Answered',
};

function getProblemUrl(url: string): string {
  return 'TODO ALEA4-P1';
}

function EventRow({ data, prevValues }: { data: HistoryItem; prevValues: any }) {
  const { prevRemember, prevUnderstand, prevApply } = prevValues;

  const remember =
    data['new-values']?.Remember !== undefined ? data['new-values'].Remember : prevRemember;
  const understand =
    data['new-values']?.Understand !== undefined ? data['new-values'].Understand : prevUnderstand;
  const apply = data['new-values']?.Apply !== undefined ? data['new-values'].Apply : prevApply;

  const deltaRemember = remember - prevRemember;
  const deltaUnderstand = understand - prevUnderstand;
  const deltaApply = apply - prevApply;

  prevValues.prevRemember = remember;
  prevValues.prevUnderstand = understand;
  prevValues.prevApply = apply;

  return (
    <TableRow>
      <TableCell>{(data.event.time as string).split(' ')[0]}</TableCell>
      <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
        {eventTypeMapping[data.event.type]}
        {data.event.type === 'problem-answer' && (
          <Link href={getProblemUrl(data.event.uri)} target="_blank" rel="noopener noreferrer">
            <OpenInNewIcon />
          </Link>
        )}
      </TableCell>
      <TableCell>
        {remember.toFixed(2)}{' '}
        <span
          style={{
            color: deltaRemember > 0 ? 'green' : deltaRemember < 0 ? 'red' : 'inherit',
          }}
        >
          {deltaRemember !== 0 && `(${deltaRemember.toFixed(2)})`}
        </span>
      </TableCell>
      <TableCell>
        {understand.toFixed(2)}{' '}
        <span
          style={{
            color: deltaUnderstand > 0 ? 'green' : deltaUnderstand < 0 ? 'red' : 'inherit',
          }}
        >
          {deltaUnderstand !== 0 && `(${deltaUnderstand.toFixed(2)})`}
        </span>
      </TableCell>
      <TableCell>
        {apply.toFixed(2)}{' '}
        <span
          style={{
            color: deltaApply > 0 ? 'green' : deltaApply < 0 ? 'red' : 'inherit',
          }}
        >
          {deltaApply !== 0 && `(${deltaApply.toFixed(2)})`}
        </span>
      </TableCell>
    </TableRow>
  );
}

function computeCompetenciesByDate(conceptHistoryData: ConceptHistory) {
  let previousRemember = 0;
  let previousUnderstand = 0;
  let previousApply = 0;

  const competenciesByDate = new Map<string, [number, number, number]>();

  conceptHistoryData.history.forEach((data) => {
    const date = (data.event.time as string).split(' ')[0];
    const remember = data['new-values'].Remember ?? previousRemember;
    const understand = data['new-values'].Understand ?? previousUnderstand;
    const apply = data['new-values'].Apply ?? previousApply;

    previousRemember = remember;
    previousUnderstand = understand;
    previousApply = apply;

    competenciesByDate.set(date, [remember, understand, apply]);
  });

  return competenciesByDate;
}

function ConceptHistoryTable({
  open,
  onClose,
  concept,
}: {
  open: boolean;
  onClose: () => void;
  concept: string;
}) {
  const [conceptHistoryData, setConceptHistoryData] = useState<ConceptHistory>();
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setConceptHistoryData(undefined);
    setLoading(true);
    function fetchConceptHistory() {
      getConceptHistory(concept)
        .then(setConceptHistoryData)
        .finally(() => setLoading(false));
    }
    fetchConceptHistory();
  }, [concept]);

  const competenciesByDate = conceptHistoryData
    ? computeCompetenciesByDate(conceptHistoryData)
    : new Map<string, [number, number, number]>();

  const chartData = Array.from(competenciesByDate.entries()).map(([date, values]) => [
    date,
    ...values,
  ]);

  const formattedChartData = [['Time', 'Remember', 'Understand', 'Apply'], ...chartData];

  const options = {
    hAxis: {
      title: 'Time',
    },
    vAxis: {
      title: 'Competency',
      viewWindow: { min: 0, max: 1 },
    },
    series: {
      0: { curveType: 'function' },
      1: { curveType: 'function' },
      2: { curveType: 'function' },
    },
  };

  const hasData = (conceptHistoryData?.history?.length ?? 0) > 0;

  const prevValues = {
    prevRemember: 0,
    prevUnderstand: 0,
    prevApply: 0,
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="lg">
      <DialogTitle>
        <ConceptView uri={concept} />
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '400px',
            }}
          >
            <CircularProgress />
            <Typography variant="body1" fontWeight="bold" align="center" sx={{ ml: 2 }}>
              Data is on its way, just a moment...
            </Typography>
          </Box>
        ) : hasData ? (
          <>
            <Chart
              chartType="LineChart"
              width="100%"
              height="400px"
              data={formattedChartData}
              options={options}
            />
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>EventType</TableCell>
                  <TableCell>{BloomDimension.Remember}</TableCell>
                  <TableCell>{BloomDimension.Understand}</TableCell>
                  <TableCell>{BloomDimension.Apply}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {conceptHistoryData?.history.map((data, index) => (
                  <EventRow key={index} data={data} prevValues={prevValues} />
                ))}
              </TableBody>
            </Table>
          </>
        ) : (
          <Typography variant="body1" fontWeight="bold" align="center">
            Sorry, we do not have any history associated with this concept.
          </Typography>
        )}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '10px',
          }}
        >
          <Button variant="contained" onClick={onClose}>
            Close
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default ConceptHistoryTable;
