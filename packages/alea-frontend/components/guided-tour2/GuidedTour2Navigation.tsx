import { CheckCircleOutline } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import ReplayIcon from '@mui/icons-material/Replay';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { conceptUriToName } from '@alea/spec';
import { FixedPositionMenu } from '@alea/stex-react-renderer';
import { PRIMARY_COL } from '@alea/utils';
import { GuidedTourState, UserAction } from '../../pages/guided-tour2/[id]';

export const findNextAvailableIndex = (
  currentIndex: number,
  leafConceptUris: string[],
  completedConceptUris: string[]
): number => {
  const completedSet = new Set(completedConceptUris);
  for (let i = 0; i < leafConceptUris.length; i++) {
    const idx = (currentIndex + i) % leafConceptUris.length;
    if (!completedSet.has(leafConceptUris[idx])) return idx;
  }
  return -1;
};

function LeafConceptDisplay({
  conceptUri,
  index,
  isButtonDisabled,
  tourState,
  onAction,
}: {
  conceptUri: string;
  index: number;
  isButtonDisabled: boolean;
  tourState: GuidedTourState;
  onAction?: (action: UserAction) => Promise<void>;
}) {
  const isCompleted = tourState.completedConceptUris.includes(conceptUri);
  const isSelected = tourState.leafConceptUris[tourState.focusConceptIdx] === conceptUri;

  const backgroundColor = isSelected ? '#176ed1' : isCompleted ? '#b1dbfa' : '#F1F3F4';
  const textColor = isSelected ? 'white' : '#0D47A1';
  const conceptName = conceptUriToName(conceptUri);

  return (
    <Box
      p={1.5}
      m={[0, 1]}
      sx={{
        cursor: isCompleted || isButtonDisabled ? 'not-allowed' : 'pointer',
        borderRadius: '8px',
        backgroundColor,
        color: textColor,
        ':hover': !isCompleted && {
          backgroundColor: isSelected ? '#3789e6' : '#c7cbd1',
          transition: 'background-color 0.3s ease',
        },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: isButtonDisabled ? 0.6 : 1,
      }}
      onClick={() => {
        if (isCompleted || isButtonDisabled) return;
        onAction({
          actionType: 'out-of-conversation',
          chosenOption: 'NAVIGATE',
          optionVerbalization: {
            NAVIGATE: `Navigate to concept <b style="color: #d629ce">${conceptName}</b>`,
          },
          targetConceptUri: conceptUri,
        } as UserAction);
      }}
    >
      <Typography variant="body1" sx={{ flexGrow: 1 }}>
        {conceptUriToName(conceptUri)}
      </Typography>

      {!isCompleted && (
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onAction({
              actionType: 'out-of-conversation',
              chosenOption: 'MARK_AS_KNOWN',
              optionVerbalization: {
                MARK_AS_KNOWN: `I know the concept <b style="color: #d629ce">${conceptName}</b>`,
              },
              targetConceptUri: conceptUri,
            } as UserAction);
          }}
          disabled={isButtonDisabled}
          sx={{ ml: 1, bgcolor: 'white' }}
        >
          <Tooltip title={'Mark as I know'}>
            <CheckCircleOutline />
          </Tooltip>
        </IconButton>
      )}

      {isCompleted && (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            sx={{ '&.Mui-disabled': { backgroundColor: 'rgba(255, 255, 255, 0.5)' } }}
            disabled
          >
            <CheckCircleOutline sx={{ color: 'green' }} />
          </IconButton>

          <IconButton
            onClick={(e) => {
              if (isButtonDisabled) return;
              e.stopPropagation();

              onAction({
                actionType: 'out-of-conversation',
                chosenOption: 'REVISIT',
                optionVerbalization: {
                  REVISIT: `Revisit concept <b style="color: #d629ce">${conceptName}</b>`,
                },
                targetConceptUri: conceptUri,
              } as UserAction);
            }}
            disabled={isButtonDisabled}
            sx={{ marginLeft: 1, bgcolor: 'white' }}
          >
            <Tooltip title={'Revisit'}>
              <ReplayIcon />
            </Tooltip>
          </IconButton>
        </Box>
      )}
    </Box>
  );
}

export function GuidedTour2Navigation({
  isButtonDisabled,
  tourState,
  onClose,
  onAction,
}: {
  isButtonDisabled: boolean;
  tourState: GuidedTourState;
  onClose: () => void;
  onAction?: (action: UserAction) => Promise<void>;
}) {
  return (
    <FixedPositionMenu
      staticContent={
        <Box display="flex" alignItems="center">
          <IconButton sx={{ m: '2px' }} onClick={() => onClose()}>
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" color={PRIMARY_COL}>
            {' '}
            Leaf Concepts list
          </Typography>
        </Box>
      }
    >
      {tourState.leafConceptUris.map((item, index) => (
        <LeafConceptDisplay
          key={item}
          conceptUri={item}
          index={index}
          isButtonDisabled={isButtonDisabled}
          tourState={tourState}
          onAction={onAction}
        />
      ))}
      ;
    </FixedPositionMenu>
  );
}
