import {
  BloomDimension,
  NumericCognitiveValues,
  clearWeightsCache,
  getSectionDependencies,
  getLmpUriWeightsAggBulk,
  isLoggedIn
} from '@alea/spec';
import { DialogContentText, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useEffect, useState } from 'react';
import CompetencyTable from './CompetencyTable';

const trafficLightStyle = {
  width: '30px',
  height: '30px',
  borderRadius: '50%',
  margin: '0px 5px ',
  boxShadow: 'inset 0px 0px 5px 2px rgba(0, 0, 0, 0.5)',
};
const getColor = (color: string, averageUnderstand: number) => {
  if (color === 'green') {
    if (averageUnderstand >= 0.8) {
      return 'lightgreen';
    } else {
      return 'gray';
    }
  }
  if (color === 'yellow') {
    if (averageUnderstand > 0.3 && averageUnderstand < 0.8) {
      return 'yellow';
    } else {
      return 'gray';
    }
  }
  if (color === 'red') {
    if (averageUnderstand < 0.3) {
      return 'red';
    } else {
      return 'gray';
    }
  }
};

function getText(averageUnderstand: number): string {
  if (averageUnderstand <= 0.3) {
    return 'More preparation needed before proceeding.';
  } else if (averageUnderstand > 0.3 && averageUnderstand <= 0.8) {
    return 'Revise materials before progressing.';
  } else {
    return 'Ready to proceed.';
  }
}

const TrafficLightIndicator = ({ sectionUri }: { sectionUri: string }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [competencyData, setCompetencyData] = useState<NumericCognitiveValues[] | null>(null);
  const [prereqs, setPrereqs] = useState<string[] | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) return;

    getSectionDependencies(sectionUri).then((dependencies) => {
      setPrereqs(dependencies);
      getLmpUriWeightsAggBulk(dependencies).then((data) => setCompetencyData(data));
    });
  }, [sectionUri]);

  const handleBoxClick = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  function refetchCompetencyData() {
    if (!prereqs?.length) {
      setCompetencyData([]);
      return;
    }
    clearWeightsCache(); // invalidateWeightsCache(prereqs); wont be enough?
    getLmpUriWeightsAggBulk(prereqs).then((data) => setCompetencyData(data));
  }

  const averageUnderstand = competencyData?.length
    ? competencyData.reduce((sum, item) => sum + (item[BloomDimension.Understand] ?? 0), 0) /
      competencyData.length
    : 0;

  if (!prereqs?.length) return null;

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease-in-out',
          alignItems: 'center',
          '&:hover': {
            width: 'calc(100% - 30px)',
            backgroundColor: 'black',
            padding: '10px',
            borderRadius: '10px',
            '& .hover-text': {
              display: 'block',
              color: 'white',
              whiteSpace: 'nowrap',
            },
          },
        }}
        onClick={handleBoxClick}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'left',
            marginLeft: '10px',
            flexShrink: '0',
          }}
        >
          <Box
            sx={{
              ...trafficLightStyle,
              backgroundColor: getColor('green', averageUnderstand),
            }}
          ></Box>
          <Box
            sx={{
              ...trafficLightStyle,
              backgroundColor: getColor('yellow', averageUnderstand),
            }}
          ></Box>
          <Box
            sx={{
              ...trafficLightStyle,
              backgroundColor: getColor('red', averageUnderstand),
            }}
          ></Box>
        </Box>
        <Box className="hover-text" sx={{ display: 'none' }}>
          <Typography>{getText(averageUnderstand)}</Typography>
        </Box>
      </Box>
      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth={true} maxWidth="lg">
        <DialogTitle>Competency Table</DialogTitle>
        <DialogContent>
          {competencyData ? (
            <DialogContentText>
              <CompetencyTable
                conceptUris={prereqs}
                competencyData={competencyData}
                onValueUpdate={refetchCompetencyData}
                showTour={true}
                defaultSort={true}
              />
            </DialogContentText>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TrafficLightIndicator;
