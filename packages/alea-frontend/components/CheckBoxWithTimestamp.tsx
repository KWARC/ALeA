import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import { roundToMinutes } from '@alea/utils';
import dayjs from 'dayjs';
import React from 'react';

export function CheckboxWithTimestamp({
  timestamp,
  setTimestamp,
  label = 'Timestamp',
}: {
  timestamp: number;
  setTimestamp: React.Dispatch<React.SetStateAction<number>>;
  label: string;
}) {
  const isChecked = timestamp !== 0;

  return (
    <div>
      <FormControlLabel
        control={
          <Checkbox
            checked={isChecked}
            onChange={(e) =>
              setTimestamp(e.target.checked ? roundToMinutes(Date.now()) : 0)
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
        value={isChecked ? dayjs(timestamp).format('YYYY-MM-DDTHH:mm') : ''}
        onChange={(e) => {
          setTimestamp(dayjs(e.target.value).valueOf());
        }}
        InputLabelProps={{ shrink: true }}
      />
    </div>
  );
}
