import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import { roundToMinutes } from '@alea/utils';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezonePlugin from 'dayjs/plugin/timezone';
import React from 'react';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

export function CheckboxWithTimestamp({
  timestamp,
  setTimestamp,
  label = 'Timestamp',
  timezone,
}: {
  timestamp: number;
  setTimestamp: React.Dispatch<React.SetStateAction<number>>;
  label: string;
  timezone?: string;
}) {
  const isChecked = timestamp !== 0;

  return (
    <div>
      <FormControlLabel
        control={
          <Checkbox
            checked={isChecked}
            onChange={(e) =>
              setTimestamp(
                e.target.checked
                  ? roundToMinutes((timezone ? dayjs().tz(timezone) : dayjs()).valueOf())
                  : 0
              )
            }
            color="primary"
          />
        }
        label={label}
      />
      <TextField
        label="Timestamp"
        variant="outlined"
        fullWidth
        type="datetime-local"
        disabled={!isChecked}
        value={
          isChecked
            ? (timezone ? dayjs(timestamp).tz(timezone) : dayjs(timestamp)).format(
                'YYYY-MM-DDTHH:mm'
              )
            : ''
        }
        onChange={(e) => {
          const input = e.target.value;
          if (!input) {
            setTimestamp(0);
            return;
          }
          const next = timezone ? dayjs.tz(input, timezone) : dayjs(input);
          setTimestamp(next.valueOf());
        }}
        InputLabelProps={{ shrink: true }}
      />
    </div>
  );
}
