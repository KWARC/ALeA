import {
  BloomDimension,
  NumericCognitiveValues,
  clearWeightsCache,
  getDependenciesForSectionAgg,
  getLmpUriWeightsAggBulk,
} from '@alea/spec';
import Box from '@mui/material/Box';
import { DialogContentText, Typography, useTheme, alpha } from '@mui/material';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useEffect, useState } from 'react';
import CompetencyTable from './CompetencyTable';
import { useIsLoggedIn } from '@alea/react-utils';

const trafficLightStyle = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  margin: '0px 4px',
  transition: 'all 0.3s ease',
};

const getColor = (color: string, averageUnderstand: number, theme: any) => {
  const isDark = theme.palette.mode === 'dark';
  const inactiveColor = isDark ? '#FFFFFF' : '#000000';

  if (color === 'green') {
    return averageUnderstand >= 0.8 ? '#4CAF50' : inactiveColor;
  }
  if (color === 'yellow') {
    return averageUnderstand > 0.3 && averageUnderstand < 0.8 ? '#FFC107' : inactiveColor;
  }
  if (color === 'red') {
    return averageUnderstand < 0.3 ? '#F44336' : inactiveColor;
  }
  return inactiveColor;
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
  const { loggedIn } = useIsLoggedIn();
  useEffect(() => {
    if (!loggedIn) return;

    getDependenciesForSectionAgg(sectionUri).then((dependencies) => {
      setPrereqs(dependencies);
      getLmpUriWeightsAggBulk(dependencies).then((data) => setCompetencyData(data));
    });
  }, [sectionUri, loggedIn]);

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

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (!prereqs?.length) return null;

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          alignItems: 'center',
          py: 0.5,
          pr: 2,
          '&:hover': {
            width: 'fit-content',
            backgroundColor: isDark ? alpha(theme.palette.primary.main, 0.1) : '#F1F5F9',
            borderRadius: '0 12px 12px 0',
            borderLeft: `4px solid ${isDark ? theme.palette.primary.main : '#ef4444'}`,
            pl: '6px',
            boxShadow: theme.shadows[2],
            '& .hover-text': {
              display: 'block',
              color: 'text.primary',
              fontWeight: 500,
              ml: 2,
            },
          },
        }}
        onClick={handleBoxClick}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'left',
            marginLeft: '4px',
            flexShrink: '0',
          }}
        >
          {['green', 'yellow', 'red'].map((color) => (
            <Box
              key={color}
              sx={{
                ...trafficLightStyle,
                backgroundColor: getColor(color, averageUnderstand, theme),
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? `inset 0px 2px 4px rgba(0, 0, 0, 0.4), ${theme.shadows[1]}`
                    : `inset 0px 0px 5px 2px rgba(255, 0, 0, 0.4), ${theme.shadows[1]}`,
                border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
              }}
            />
          ))}
        </Box>
        <Box className="hover-text" sx={{ display: 'none' }}>
          <Typography variant="body2">{getText(averageUnderstand)}</Typography>
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
