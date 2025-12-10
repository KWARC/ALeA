import { SafeHtml } from '@alea/react-utils';
import {
  BloomDimension,
  ConceptAndDefinition,
  NumericCognitiveValues,
  SHOW_DIMENSIONS,
  clearWeightsCache,
  getDefiniedaInSectionAgg,
  getLmpUriWeightsAggBulk,
  isLoggedIn,
} from '@alea/spec';
import { BG_COLOR } from '@alea/utils';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
} from '@mui/material';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import LinearProgress from '@mui/material/LinearProgress';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import CompetencyTable from './CompetencyTable';
import PracticeProblem from './PracticeProblem';
import { getLocaleObject } from './lang/utils';
import { DimIcon } from './stex-react-renderer';
import styles from './styles/competency-indicator.module.scss';

function CompetencyBar({ dim, val }: { dim: BloomDimension; val: number }) {
  const hue = 120 * val;
  return (
    <Tooltip title={`${dim}: ${(val * 100).toFixed(1)}%`}>
      <LinearProgress
        sx={{
          backgroundColor: `hsl(${hue}, 100%, 90%)`,
          '& .MuiLinearProgress-bar': {
            backgroundColor: `hsl(${hue}, 100%, 50%)`,
          },
        }}
        variant="determinate"
        value={Math.round(val * 100)}
      />
    </Tooltip>
  );
}

const SectionReview = ({
  sectionUri,
  sectionTitle,
}: {
  sectionUri: string;
  sectionTitle: string;
}) => {
  const [competencyData, setCompetencyData] = useState<NumericCognitiveValues[] | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [definedConcepts, setDefinedConcepts] = useState<ConceptAndDefinition[] | null>(null);
  const [URIs, setURIs] = useState<string[]>([]);
  const t = getLocaleObject(useRouter());
  const [isAccordionExpanded, setIsAccordionExpanded] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) return;
    getDefiniedaInSectionAgg(sectionUri).then(setDefinedConcepts);
  }, [sectionUri]);

  useEffect(() => {
    if (!definedConcepts) return;
    const URIs = [...new Set(definedConcepts.flatMap((data) => data.conceptUri))];
    setURIs(URIs);
    getLmpUriWeightsAggBulk(URIs).then((data) => setCompetencyData(data));
  }, [definedConcepts]);

  function refetchCompetencyData() {
    if (!URIs?.length) return;
    clearWeightsCache(); // invalidateWeightsCache(URIs); wont be enough?
    getLmpUriWeightsAggBulk(URIs).then((data) => setCompetencyData(data));
  }

  const averages = SHOW_DIMENSIONS.reduce((acc, competency) => {
    const avg = competencyData?.length
      ? competencyData.reduce((sum, item) => sum + (item[competency] ?? 0), 0) /
        competencyData.length
      : 0;
    acc[competency] = avg;
    return acc;
  }, {} as { [competency: string]: number });

  if (!definedConcepts?.length) return null;

  return (
    <Box>
      <Accordion onChange={(_, isExpanded) => setIsAccordionExpanded(isExpanded)}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{ '& .MuiAccordionSummary-content': { overflow: 'hidden' } }}
        >
          <Box style={{ display: 'flex' }}>
            <Box className={styles['summary-competence-bar-container']}>
              {SHOW_DIMENSIONS.map((dim) => (
                <CompetencyBar key={dim} dim={dim} val={averages[dim]} />
              ))}
            </Box>
            <span style={{ color: 'gray', whiteSpace: 'nowrap' }}>{t.review}</span>
            &nbsp;
            <b>
              <SafeHtml html={sectionTitle} />
            </b>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box className={styles['details-competence-bar-container']}>
            {SHOW_DIMENSIONS.map((dim) => (
              <Tooltip key={dim} title={`${dim}: ${(averages[dim] * 100).toFixed(1)}%`}>
                <Box
                  className={styles['details-competence-bar']}
                  bgcolor={BG_COLOR}
                  onClick={() => setOpenDialog(true)}
                >
                  <DimIcon dim={dim} white={false} showTitle={true} />
                  <CompetencyBar dim={dim} val={averages[dim]} />
                </Box>
              </Tooltip>
            ))}
          </Box>
          <PracticeProblem
            sectionUri={sectionUri}
            showHideButton={true}
            isAccordionOpen={isAccordionExpanded}
          />
        </AccordionDetails>
      </Accordion>
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth={true} maxWidth="lg">
        <DialogTitle>
          <b>{t.details}</b>
        </DialogTitle>
        <DialogContent>
          {competencyData ? (
            <DialogContentText>
              <CompetencyTable
                conceptUris={URIs}
                competencyData={competencyData}
                onValueUpdate={refetchCompetencyData}
              />
            </DialogContentText>
          ) : null}
        </DialogContent>
        <DialogActions style={{ justifyContent: 'center' }}>
          <Button onClick={() => setOpenDialog(false)} color="primary" variant="contained">
            {t.close}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SectionReview;
