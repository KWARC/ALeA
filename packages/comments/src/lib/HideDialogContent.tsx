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
import { HiddenStatus } from '@stex-react/spec';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { HiddenState } from './CommentMenu';
import { getLocaleObject } from './lang/utils';

const HIDE_STATUSES = [
  HiddenStatus.ABUSE,
  HiddenStatus.INCORRECT,
  HiddenStatus.IRRELEVANT,
  HiddenStatus.OTHER,
];
function statusToName(h: HiddenStatus, t: any) {
  switch (h) {
    case HiddenStatus.ABUSE:
      return t.abusive;
    case HiddenStatus.INCORRECT:
      return t.incorrect;
    case HiddenStatus.IRRELEVANT:
      return t.irrelevant;
    case HiddenStatus.OTHER:
    default:
      return t.other;
  }
}

export function HideDialogContent({
  forSpam,
  forUnhide,
  onClose,
}: {
  forSpam: boolean;
  forUnhide: boolean;
  onClose?: (state?: HiddenState) => void;
}) {
  const t = getLocaleObject(useRouter());
  const [status, setStatus] = useState('');
  const [hiddenJustification, setJustification] = useState('');

  const okString = forSpam ? t.markSpam : forUnhide ? t.unhideComment : t.hideComment;

  function getState() {
    if (forSpam) {
      return { hiddenStatus: HiddenStatus.SPAM, hiddenJustification };
    }
    if (forUnhide) {
      return { hiddenStatus: HiddenStatus.UNHIDDEN, hiddenJustification };
    }
    const s = HiddenStatus[status as keyof typeof HiddenStatus];
    if (!s) return undefined;
    return { hiddenStatus: s, hiddenJustification };
  }

  return (
    <>
      <DialogTitle>{okString}</DialogTitle>
      <DialogContent sx={{ minWidth: '200px', pt: '6px !important' }}>
        <DialogContentText id="alert-dialog-description">
          {!forSpam && !forUnhide && (
            <FormControl fullWidth>
              <InputLabel id="cause-select-label">{t.cause}</InputLabel>
              <Select
                labelId="cause-select-label"
                id="simple-select"
                value={status}
                label={t.cause}
                onChange={(e) => setStatus(e.target.value)}
              >
                {HIDE_STATUSES.map((status) => (
                  <MenuItem key={status} value={HiddenStatus[status]}>
                    {statusToName(status, t)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField
            fullWidth
            sx={{ mt: '10px' }}
            value={hiddenJustification}
            onChange={(e) => setJustification(e.target.value)}
            id="outlined-basic"
            label={t.justification}
            variant="outlined"
          />
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose && onClose()}>{t.cancel}</Button>
        <Button disabled={!getState()} onClick={() => onClose && onClose(getState())} autoFocus>
          {okString}
        </Button>
      </DialogActions>
    </>
  );
}
