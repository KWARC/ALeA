import {
  Button,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import TextField from '@mui/material/TextField';
import { DEFAULT_POINTS, GrantReason } from '@alea/spec';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { getLocaleObject } from './lang/utils';

export interface GrantInfo {
  reason: GrantReason;
  numPoints: number;
}

export function PointsGrantDialogContent({
  onClose,
}: {
  onClose?: (grant?: GrantInfo) => void;
}) {
  const t = getLocaleObject(useRouter());
  const [reason, setReason] = useState(GrantReason.HELPFUL_COMMENT);
  const [numPoints, setNumPoints] = useState(3);

  return (
    <>
      <DialogTitle>{t.grantPoints}</DialogTitle>
      <DialogContent sx={{ minWidth: '200px', pt: '6px !important' }}>
        <DialogContentText id="alert-dialog-description">
          <FormControl fullWidth>
            <InputLabel id="cause-select-label">{t.cause}</InputLabel>
            <Select
              labelId="cause-select-label"
              id="reason-selec"
              value={reason}
              label={t.cause}
              onChange={(e) => {
                const r = e.target.value as GrantReason;
                setReason(r);
                setNumPoints(DEFAULT_POINTS.get(r) ?? 1);
              }}
            >
              {Object.values(GrantReason).map((reason) => (
                <MenuItem key={reason} value={reason}>
                  {t[reason]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            sx={{ mt: '10px' }}
            value={numPoints}
            onChange={(e) => setNumPoints(+e.target.value)}
            label={t.points}
            type="number"
            id="num-points"
            variant="outlined"
          />
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose && onClose()}>Cancel</Button>
        <Button
          onClick={() => onClose && onClose({ reason, numPoints })}
          autoFocus
        >
          {t.grantPoints}
        </Button>
      </DialogActions>
    </>
  );
}
