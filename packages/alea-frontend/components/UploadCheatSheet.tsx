import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { UploadCheatSheetContent } from './UploadCheatSheetContent';

export interface UploadCheatSheetProps {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
  instanceId: string;
  courseId: string;
  universityId: string;
  userId: string;
  isInstructor?: boolean;
}

export function UploadCheatSheet({
  open,
  onClose,
  onUploaded,
  instanceId,
  courseId,
  universityId,
  userId,
  isInstructor = false,
}: UploadCheatSheetProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: styles.paper }}
    >
      <DialogTitle sx={styles.title}>
        <Box sx={styles.titleInner}>
          <UploadFileIcon fontSize="small" />
          <Typography variant="subtitle1" sx={styles.titleText}>
            Upload Cheat Sheet
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={styles.closeBtn}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={styles.content}>
        <UploadCheatSheetContent
          instanceId={instanceId}
          courseId={courseId}
          universityId={universityId}
          userId={userId}
          isInstructor={isInstructor}
          onUploaded={onUploaded}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

const styles = {
  paper: {
    borderRadius: 3,
    overflow: 'hidden',
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    py: 1.5,
    px: 2.5,
  },
  titleInner: { display: 'flex', alignItems: 'center', gap: 1 },
  titleText: { fontWeight: 600 },
  closeBtn: {
    color: 'primary.contrastText',
    '&:hover': { bgcolor: 'primary.dark' },
  },
  content: {
    pt: 2,
    pb: 3,
    px: 3,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
};