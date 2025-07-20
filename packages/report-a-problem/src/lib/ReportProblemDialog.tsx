import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  FormHelperText,
  TextField,
} from '@mui/material';
import { getUserInfo } from '@stex-react/api';
import { handleViewSource } from '@stex-react/stex-react-renderer';
import { useRouter } from 'next/router';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { createNewIssue, SelectionContext } from './issueCreator';
import { getLocaleObject } from './lang/utils';

export function ReportProblemDialog({
  open,
  setOpen,
  selectedText,
  context,
  onCreateIssue,
}: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  selectedText: string;
  context: SelectionContext[];
  onCreateIssue: (issueUrl: string) => void;
}) {
  const t = getLocaleObject(useRouter());
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [userName, setUserName] = useState('');
  const [postAnonymously, setPostAnonymously] = useState(false);

  const descriptionError = !description?.length;
  const anyError = descriptionError;

  useEffect(() => {
    getUserInfo().then((userInfo) => {
      if (!userInfo) return;
      setUserName(userInfo.fullName);
    });
  }, []);

  return (
    <Dialog
      id="report-a-problem-dialog"
      onClose={() => setOpen(false)}
      open={open}
      sx={{ zIndex: 20000 }}
    >
      <Box sx={{ borderBottom: '1px solid #eee', justifyContent: 'center', display: 'flex' }}>
        <h2>{t.reportProblem}</h2>
      </Box>
      <DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#00000099' }}>{t.selectedContent}</span>
          {context[0] && (
            <Button
              variant="contained"
              size="small"
              onClick={() => handleViewSource(context[0].fragmentUri)}
              endIcon={<OpenInNewIcon />}
              sx={{ padding: '2px 6px', minHeight: '24px', fontSize: '0.75rem', mb: 0.5 }}
            >
              View Source
            </Button>
          )}
        </Box>

        <Box
          sx={{
            padding: '5px',
            border: '1px solid #777',
            color: '#777',
            borderRadius: '5px',
            maxHeight: '100px',
            overflowY: 'auto',
            mb: 1,
          }}
        >
          {selectedText}
        </Box>
        <FormHelperText sx={{ margin: '0 5px 15px 0' }}>*{t.helperText}</FormHelperText>

        <TextField
          error={descriptionError}
          fullWidth
          label={t.issueDescription}
          style={{ textAlign: 'left' }}
          multiline
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {!!userName && (
          <FormControlLabel
            control={
              <Checkbox
                checked={postAnonymously}
                onChange={(e) => setPostAnonymously(e.target.checked)}
              />
            }
            label={t.postAnonymously}
          />
        )}
        <i style={{ display: 'block' }}>
          {!postAnonymously && !!userName && t.nameShared.replace('$1', userName)}
          {postAnonymously && !!userName && t.anonymousRegret}
        </i>
      </DialogContent>
      <DialogActions>
        <Button disabled={isCreating} onClick={() => setOpen(false)}>
          {t.cancel}
        </Button>
        <Button
          disabled={anyError || isCreating}
          onClick={async () => {
            setIsCreating(true);
            try {
              const issueLink = await createNewIssue(
                description,
                selectedText,
                context,
                postAnonymously ? '' : userName
              );
              onCreateIssue(issueLink);
            } catch (e) {
              console.error(e);
              alert('We encountered an error: ' + e);
              onCreateIssue('');
            } finally {
              setIsCreating(false);
              setOpen(false);
            }
          }}
          autoFocus
        >
          {t.createIssue}
        </Button>
        {isCreating ? <CircularProgress size={20} sx={{ ml: '5px' }} /> : <Box width={25}></Box>}
      </DialogActions>
    </Dialog>
  );
}
