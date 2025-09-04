import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import { Box, IconButton } from '@mui/material';
import { useEffect, useState } from 'react';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AlarmIcon from '@mui/icons-material/Alarm';
import { TimerEvent, TimerEventType, getElapsedTime, getTotalElapsedTime } from '@stex-react/spec';

export function timerEvent(type: TimerEventType, problemIdx?: number): TimerEvent {
  return {
    timestamp_ms: Date.now(),
    type,
    problemIdx,
  };
}

const formatElapsedTime = (ms: number): string => {
  // const tenths = Math.floor((ms % 1000) / 100);
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const displaySeconds = seconds % 60;
  const displayMinutes = minutes % 60;
  const displayHours = hours % 24;

  const hourSection = seconds >= 3600 ? `${displayHours.toString()}:` : '';
  const minuteSection = `${displayMinutes.toString().padStart(2, '0')}:`;
  const secondSection = displaySeconds.toString().padStart(2, '0');
  return hourSection + minuteSection + secondSection; // + '.' + tenths;
};

export function QuizTimer({
  quizEndTs,
  events,
  showClock,
  showHideClock,
  onPause,
  onUnpause,
}: {
  quizEndTs?: number;
  events: TimerEvent[];
  showClock: boolean;
  showHideClock: (v: boolean) => void;
  onPause?: () => void;
  onUnpause?: () => void;
}) {
  const isPaused = !!events?.length && events[events.length - 1].type === TimerEventType.PAUSE;
  return (
    <Box
      display="flex"
      alignItems="center"
      border="1px solid #CCC"
      borderRadius="5px"
      height="fit-content"
      pl="10px"
    >
      {showClock ? (
        <>
          <Box fontSize="24px">
            <Timer quizEndTs={quizEndTs} events={events} />
          </Box>
          {!quizEndTs && (
            <IconButton
              onClick={() => {
                if (!onPause || !onUnpause) return;
                if (isPaused) onUnpause();
                else onPause();
              }}
            >
              {isPaused ? (
                <PlayCircleIcon fontSize="large" />
              ) : (
                <PauseCircleIcon fontSize="large" />
              )}
            </IconButton>
          )}
        </>
      ) : (
        <AlarmIcon />
      )}
      <IconButton onClick={() => showHideClock(!showClock)}>
        {showClock ? <VisibilityOffIcon /> : <VisibilityIcon />}
      </IconButton>
    </Box>
  );
}

export function Timer({
  quizEndTs,
  events,
  problemIndex,
}: {
  quizEndTs?: number;
  events: TimerEvent[];
  problemIndex?: number;
}) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const leftTime = quizEndTs ? quizEndTs - Date.now() : undefined;

  useEffect(() => {
    const intervalId = setInterval(() => {
      const et =
        problemIndex === undefined
          ? getTotalElapsedTime(events)
          : getElapsedTime(events, problemIndex);
      setElapsedTime(et);
    }, 500);

    return () => clearInterval(intervalId);
  }, [events, problemIndex]);

  if (!leftTime) {
    return (
      <span style={{ color: 'gray', fontFamily: 'monospace' }}>
        {formatElapsedTime(elapsedTime)}
      </span>
    );
  }
  if (leftTime < 0) {
    return <span style={{ color: 'gray', fontFamily: 'monospace' }}>Quiz Ended</span>;
  }
  if (leftTime > 0) {
    return (
      <span style={{ color: 'gray', fontFamily: 'monospace' }}>{formatElapsedTime(leftTime)}</span>
    );
  }
}
