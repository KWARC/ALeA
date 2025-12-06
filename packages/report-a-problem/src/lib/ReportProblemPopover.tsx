import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { Box, Button, Dialog, DialogActions, IconButton, Snackbar, Tooltip } from '@mui/material';
import { CommentNoteToggleView } from '@alea/comments';
import { SECONDARY_COL } from '@alea/utils';
import { useRouter } from 'next/router';
import { PropsWithChildren, useState } from 'react';
import { createPortal } from 'react-dom';
import { issuesUrlList, SelectionContext } from './issueCreator';
import { getLocaleObject } from './lang/utils';
import { ReportProblemDialog } from './ReportProblemDialog';
import { useTextSelection } from './useTextSelection';

type Props = {
  target?: HTMLElement;
  mount?: HTMLElement;
};

function Portal(props: PropsWithChildren<{ mount?: HTMLElement }>) {
  if (typeof document === 'undefined') return null;
  return createPortal(props.children, props.mount || document.body);
}

function getContext(node?: Node): SelectionContext[] {
  if (!node) return [];
  try {
    const parentContext = getContext(node.parentNode as Node);
    const fragmentUri = (node as any).attributes?.['fragment-uri']?.value;
    const fragmentKind = (node as any).attributes?.['fragment-kind']?.value;

    if (!fragmentUri) return parentContext;
    return [{ fragmentUri, fragmentKind }, ...parentContext];
  } catch (e) {
    console.error(e);
    console.error(node);
    return [];
  }
}

function buttonProps(color: string) {
  return {
    border: `2px solid ${color}`,
    borderRadius: '500px',
    color,
    backgroundColor: 'white',
    boxShadow: '0px 8px 15px rgba(0, 0, 0, 0.5)',
    transition: 'all 0.3s ease 0s',
    zIndex: 100,
    ml: '5px',
    ':hover': {
      boxShadow: '0px 15px 20px rgba(0, 0, 0, 0.4)',
      transform: 'translateY(1px)',
      backgroundColor: 'white',
    },
  };
}

function isValidContextForComments(context: SelectionContext[]) {
  const nearestFragmentKind = context?.[0]?.fragmentKind;
  return ['Paragraph', 'Section', 'Slide'].includes(nearestFragmentKind) && !!context[0].fragmentUri;
}

export function ReportProblemPopover(props: Props) {
  const t = getLocaleObject(useRouter());
  const { clientRect, isCollapsed, textContent, commonAncestor } = useTextSelection();
  const context = getContext(commonAncestor);

  const [open, setOpen] = useState(false);
  const [ncdOpen, setNcdOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedContext, setSelectedContext] = useState<SelectionContext[]>([]);

  const [snackBarOpen, setSnackbarOpen] = useState(false);
  const [newIssueUrl, setNewIssueUrl] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const validContextForComments = isValidContextForComments(context);
  const validSelectedContextForComments = isValidContextForComments(selectedContext);

  return (
    <>
      <Portal mount={props.mount}>
        {clientRect != null && !isCollapsed && textContent?.trim().length && (
          <Box
            sx={{
              position: 'absolute',
              left: `${clientRect.left + clientRect.width / 2 - 45}px`,
              top: `${clientRect.top - 50}px`,
            }}
          >
            {validContextForComments && (
              <Tooltip title={t.notesAndComments}>
                <IconButton
                  sx={{ ...buttonProps(SECONDARY_COL), ml: '5px' }}
                  onClick={() => {
                    setIsPrivate(false);
                    setSelectedText(textContent.trim());
                    setSelectedContext(context);
                    setNcdOpen(true);
                  }}
                >
                  <ChatBubbleIcon color="secondary" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={t.reportAProblem}>
              <IconButton
                sx={buttonProps('#f2c300')}
                onClick={() => {
                  setSelectedText(textContent.trim());
                  setSelectedContext(context);
                  setOpen(true);
                }}
              >
                <ReportProblemIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Portal>

      <Snackbar
        open={snackBarOpen}
        autoHideDuration={60000}
        onClose={() => setSnackbarOpen(false)}
        message={newIssueUrl ? t.newIssueCreated : t.somethingWrong}
        action={
          <a href={newIssueUrl || issuesUrlList(context)} target="_blank" rel="noreferrer">
            <b style={{ color: 'dodgerblue' }}>
              {t.seeIssue}
              {newIssueUrl ? '' : 'S'}&nbsp;
              <OpenInNewIcon fontSize="small" sx={{ verticalAlign: 'bottom' }} />
            </b>
          </a>
        }
      />
      <ReportProblemDialog
        open={open}
        setOpen={setOpen}
        selectedText={selectedText}
        context={selectedContext}
        onCreateIssue={(issueUrl) => {
          if (issueUrl?.length) {
            setNewIssueUrl(issueUrl);
            setSnackbarOpen(true);
          }
        }}
      />
      {validSelectedContextForComments && ncdOpen && (
        <Dialog
          onClose={() => {
            setNcdOpen(false);
            setSelectedContext([]);
          }}
          open={ncdOpen}
          maxWidth="lg"
        >
          <Box onClick={(e) => e.stopPropagation()}>
            <CommentNoteToggleView
              defaultPrivate={isPrivate}
              uri={selectedContext[0].fragmentUri}
              selectedText={selectedText}
              selectedElement={commonAncestor}
            />
          </Box>
          <DialogActions sx={{ p: '0' }}>
            <Button onClick={() => setNcdOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
