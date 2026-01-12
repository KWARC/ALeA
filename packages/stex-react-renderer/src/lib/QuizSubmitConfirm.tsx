import {
  Button,
  DialogActions,
  DialogContent,
  DialogContentText,
} from '@mui/material';
import { getLocaleObject } from './lang/utils';
import { useRouter } from 'next/router';

export function QuizSubmitConfirm({
  left,
  onClose
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
        <Button
          onClick={() => onClose(true)}
          autoFocus
        >
          Finish
        </Button>
      </DialogActions>
    </>
  );
}
