import {
  Button,
  Checkbox,
  DialogActions,
  DialogContent,
  DialogContentText,
  FormControlLabel,
  TextField,
} from '@mui/material';
import { getUserInfo } from '@stex-react/spec';
import { useEffect, useState } from 'react';
import { getLocaleObject } from './lang/utils';
import { useRouter } from 'next/router';

export function QuizSubmitConfirm({
  left,
  onClose,
}: {
  left: number;
  onClose: (submit: boolean) => void;
}) {
  const { quiz: t } = getLocaleObject(useRouter());

  return (
    <>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {left > 0 ? t.didntAnswer.replace('$1', `${left}`) : ''}
          {t.sureFinish}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button onClick={() => onClose(true)} autoFocus>
          Finish
        </Button>
      </DialogActions>
    </>
  );
}
