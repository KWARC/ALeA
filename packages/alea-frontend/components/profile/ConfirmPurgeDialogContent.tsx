import DeleteIcon from '@mui/icons-material/Delete';
import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { getLocaleObject } from '../../lang/utils';

export function ConfirmPurgeDialogContent({ onClose }) {
  const router = useRouter();
  const { myProfile: t } = getLocaleObject(router);
  const [text, setText] = useState('');

  return (
    <>
      <DialogTitle sx={{ bgcolor: 'error.light', color: 'white' }}>{t.confirmPurge}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ my: 2 }}>
          {t.purgeWarning}
          <Typography component="div" sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            Enter this text to confirm: <b>{t.confirmText}</b>
          </Typography>
        </DialogContentText>
        <TextField
          fullWidth
          label={t.confirmation}
          value={text}
          onChange={(e) => setText(e.target.value)}
          variant="outlined"
        />
        {text.toLocaleLowerCase() === t.confirmText.toLocaleLowerCase() && (
          <Alert severity="info" sx={{ mt: 2, mb: 2, fontSize: '0.85rem' }}>
            Purging may take some time. If it still isn&apos;t completed after 12 hours, please
            contact{' '}
            <a href="mailto:jonas.betzendahl@fau.de" style={{ color: 'inherit', fontWeight: 600 }}>
              jonas.betzendahl@fau.de
            </a>
            .
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>{t.cancel}</Button>
        <Button
          onClick={() => onClose(true)}
          disabled={text.toLocaleLowerCase() !== t.confirmText.toLocaleLowerCase()}
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
        >
          {t.purge}
        </Button>
      </DialogActions>
    </>
  );
}
