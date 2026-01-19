import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Alert,
  Typography,
  TextField,
} from '@mui/material';

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  error?: string;
  aclId?: string;
  showAclIdInput?: boolean;
  confirmAclIdInput?: string;
  onConfirmAclIdInputChange?: (v: string) => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  error,

  aclId,
  showAclIdInput,
  confirmAclIdInput,
  onConfirmAclIdInputChange,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
    >
      <DialogTitle id="confirmation-dialog-title">Confirm Deletion</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText id="confirmation-dialog-description" component="div">
          <Typography component="span">
            Are you sure you want to delete this ACL: <strong>{aclId}</strong>?
          </Typography>

          <Typography component="p">
            This action cannot be undone. If this ACL is assigned to any resource or is a member of
            another ACL, then they will also be deleted.
          </Typography>
        </DialogContentText>

        {showAclIdInput && (
          <TextField
            fullWidth
            size="small"
            label="Type ACL ID to confirm"
            sx={{ mt: 2 }}
            value={confirmAclIdInput ?? ''}
            onChange={(e) => onConfirmAclIdInputChange?.(e.target.value)}
            error={!!confirmAclIdInput && confirmAclIdInput.trim() !== (aclId ?? '')}
            helperText={
              !!confirmAclIdInput && confirmAclIdInput.trim() !== (aclId ?? '')
                ? 'Entered ACL ID does not match'
                : 'Type the ACL ID exactly to enable deletion'
            }
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          autoFocus={!showAclIdInput || confirmAclIdInput?.trim() === aclId}
          disabled={!!showAclIdInput && confirmAclIdInput?.trim() !== aclId}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};
