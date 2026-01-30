import PendingOutlinedIcon from '@mui/icons-material/PendingOutlined';
import { Box, Dialog, IconButton, Slider } from '@mui/material';
import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';
import {
  ALL_SMILEY_LEVELS,
  BloomDimension,
  SelfAssessmentSmileysEvent,
  SmileyCognitiveValues,
  SmileyLevel,
  getUriSmileys,
  reportEvent,
  smileyToLevel,
} from '@alea/spec';
import { SafeHtml } from '@alea/react-utils';
import { BG_COLOR, PRIMARY_COL, SECONDARY_COL } from '@alea/utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getLocaleObject } from './lang/utils';

const ICON_SIZE = 33;

const CustomTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))({
  [`& .${tooltipClasses.tooltip}`]: {
    maxWidth: 'none',
    margin: '0',
    padding: '0',
    backgroundColor: '#ffffff00',
  },
});

export function DimIcon({
  dim,
  white = false,
  showTitle = true,
}: {
  dim: BloomDimension;
  white?: boolean;
  showTitle?: boolean;
}) {
  const t = getLocaleObject(useRouter());
  return (
    <img
      width={ICON_SIZE}
      height={ICON_SIZE}
      title={showTitle ? t.iconHovers[dim] : undefined}
      src={`/bloom-dimensions/${dim}${white ? '_white' : ''}.svg`}
      alt={dim}
    />
  );
}

export function LevelIcon({ level, highlighted }: { level?: SmileyLevel; highlighted: boolean }) {
  if (level === undefined) {
    return <PendingOutlinedIcon sx={{ fontSize: `${ICON_SIZE}px` }} color="disabled" />;
  }
  return (
    <img
      width={ICON_SIZE}
      height={ICON_SIZE}
      src={`/likert-icons/${level}${highlighted ? 'color' : ''}.svg`}
      alt={`${level}`}
      style={{ borderRadius: '500px' }}
    />
  );
}

function SelfAssessmentPopup({
  dims,
  uri,
  smileys,
  htmlName,
  dimText = true,
  onValueUpdate,
}: {
  dims: BloomDimension[];
  uri: string;
  smileys: SmileyCognitiveValues | undefined;
  htmlName: string;
  dimText?: boolean;
  onValueUpdate: () => void;
}) {
  return (
    <Box
      sx={{
        background: SECONDARY_COL,
        border: `1px solid ${PRIMARY_COL}`,
        userSelect: 'none',
      }}
      p="5px 3px"
      borderRadius="5px"
    >
      {dims.map((dim, idx) => (
        <Box key={dim} mt={idx ? '5px' : '0'}>
          <SelfAssessmentDialogRow
            dim={dim}
            uri={uri}
            htmlName={htmlName}
            selectedLevel={smileyToLevel(smileys?.[dim])}
            dimText={dimText}
            onValueUpdate={onValueUpdate}
          />
        </Box>
      ))}
    </Box>
  );
}

function getMarks(
  dim: BloomDimension,
  rememberValue: SmileyLevel | undefined,
  understandValue: SmileyLevel | undefined
) {
  const value = dim === BloomDimension.Remember ? rememberValue : understandValue;
  return ALL_SMILEY_LEVELS.map((l) => {
    return {
      value: l,
      label: <LevelIcon level={l} highlighted={value === undefined || l <= value} />,
    };
  });
}

export function ConfigureLevelSlider({
  levels,
  dim,
  onChange,
  onIconClick,
}: {
  levels: any;
  dim: BloomDimension;
  onChange: any;
  onIconClick: any;
}) {
  const t = getLocaleObject(useRouter());
  return (
    <>
      <Tooltip title={`${t.iconHovers[dim]}. ${t.enableDisableFilter}`}>
        <IconButton onClick={() => onIconClick()}>
          <DimIcon showTitle={false} dim={dim} white={false} />
        </IconButton>
      </Tooltip>{' '}
      <Slider
        step={1}
        value={levels[dim] === undefined ? 2 : levels[dim]}
        valueLabelDisplay="auto"
        valueLabelFormat={(value) => {
          return (t.smileyTooltips as any)[dim]?.[value];
        }}
        onChange={(_e: Event, newValue: any /*SmileyLevel*/) => {
          onChange(newValue);
        }}
        marks={getMarks(dim, levels.Remember, levels.Understand)}
        min={-2}
        max={2}
        sx={{
          ml: '20px',
          filter: levels[dim] === undefined ? 'grayscale(1)' : undefined,
        }}
        disabled={levels[dim] === undefined}
      />
    </>
  );
}

export type SmileyEventType = 'self-assessment-5StepLikertSmileys' | 'edit-5StepLikertSmileys';

export function SelfAssessmentDialogRow({
  dim,
  uri,
  htmlName,
  dimText,
  selectedLevel,
  onValueUpdate,
  eventType = 'self-assessment-5StepLikertSmileys',
}: {
  dim: BloomDimension;
  uri: string;
  htmlName: string;
  dimText: boolean;
  selectedLevel?: number;
  onValueUpdate?: () => void;
  eventType?: SmileyEventType;
}) {
  const t = getLocaleObject(useRouter());
  return (
    <Box display="flex">
      <DimIcon dim={dim} white={true} />

      <Box>
        {dimText && (
          <span
            style={{
              color: 'white',
              fontWeight: 'bold',
              fontSize: '14px',
              textAlign: 'left',
              marginLeft: '5px',
            }}
          >
            I {dim.toLowerCase()}{' '}
            <Box
              sx={{
                mr: '5px',
                display: 'inline',
                '& *': { display: 'inline!important' },
              }}
            >
              <SafeHtml html={htmlName} />
            </Box>
          </span>
        )}
        {ALL_SMILEY_LEVELS.map((l) => (
          <Tooltip key={l} title={(t.smileyTooltips as any)[dim]?.[l] || `Level ${l}`}>
            <IconButton
              sx={{ p: '0' }}
              onClick={async () => {
                await reportEvent({
                  type: eventType,
                  concept: uri,
                  competences: {
                    [dim]: `smiley${l}`,
                  },
                } as SelfAssessmentSmileysEvent);
                onValueUpdate?.();
              }}
            >
              <LevelIcon level={l} highlighted={l === selectedLevel} />
            </IconButton>
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
}

export function SelfAssessment2({
  dims,
  uri,
  needUpdateMarker = 0,
}: {
  dims: BloomDimension[];
  uri: string;
  needUpdateMarker?: any;
}) {
  const [smileys, setSmileys] = useState<SmileyCognitiveValues | undefined>(undefined);
  function onValueUpdate() {
    getUriSmileys([uri]).then((v) => setSmileys(v.get(uri)));
  }
  useEffect(() => {
    setSmileys(undefined);
    onValueUpdate();
  }, [uri, needUpdateMarker]);
  return (
    <SelfAssessmentPopup
      dims={dims}
      uri={uri}
      smileys={smileys}
      htmlName={''}
      dimText={false}
      onValueUpdate={onValueUpdate}
    />
  );
}

export function SelfAssessmentDialog({
  dims,
  uri,
  htmlName,
  onUpdate = undefined,
}: {
  dims: BloomDimension[];
  uri: string;
  htmlName: string;
  onUpdate?: (level: SmileyCognitiveValues) => void;
}) {
  const [open, setOpen] = useState(false);
  const [smileys, setSmileys] = useState<SmileyCognitiveValues | undefined>(undefined);
  function onValueUpdate() {
    getUriSmileys([uri]).then((v) => {
      setSmileys(v.get(uri));
      if (onUpdate) onUpdate(v.get(uri) as any);
    });
  }
  useEffect(() => {
    setSmileys(undefined);
    onValueUpdate();
  }, [uri]);

  return (
    <>
      <CustomTooltip
        disableFocusListener
        title={
          <Box sx={{ boxShadow: '2px 7px 31px 8px rgba(0,0,0,0.75)' }}>
            <SelfAssessmentPopup
              dims={dims}
              uri={uri}
              smileys={smileys}
              htmlName={htmlName}
              onValueUpdate={() => onValueUpdate()}
            />
          </Box>
        }
      >
        <Box
          display="flex"
          p="0"
          border="1px solid #AAA"
          borderRadius="10px"
          width="fit-content"
          bgcolor={BG_COLOR}
          sx={{ cursor: 'pointer' }}
          onClick={() => setOpen(true)}
        >
          {dims.map((dim) => (
            <Box key={dim} display="flex" flexDirection="column" alignItems="center">
              <DimIcon dim={dim} white={false} />
              <LevelIcon level={smileyToLevel(smileys?.[dim])} highlighted={true} />
            </Box>
          ))}
        </Box>
      </CustomTooltip>
      <Dialog onClose={() => setOpen(false)} open={open}>
        <SelfAssessmentPopup
          dims={dims}
          uri={uri}
          smileys={smileys}
          htmlName={htmlName}
          onValueUpdate={() => onValueUpdate()}
        />
      </Dialog>
    </>
  );
}
