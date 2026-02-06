import {
  UpdateACLRequest,
  deleteAcl,
  getAcl,
  getAclSuggestions,
  getUserSuggestions,
  hasAclAssociatedResources,
  isValid,
  updateAcl,
} from '@alea/spec';
import { Delete } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AclAutocompleteSelector from '../../../components/AclAutocompleteSelector';
import { ConfirmationDialog } from '../../../components/confirmation-dialog/ConfirmationDialog';
import MainLayout from '../../../layouts/MainLayout';

const UpdateAcl: NextPage = () => {
  const router = useRouter();
  const { query } = router;
  const [aclId, setAclId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [memberUserIds, setMemberUserIds] = useState<string[]>([]);
  const [memberACLIds, setMemberACLIds] = useState<string[]>([]);
  const [updaterACLId, setUpdaterACLId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [isUpdaterACLValid, setIsUpdaterACLValid] = useState(true);
  const [isTypingMemberId, setIsTypingMemberId] = useState(false);
  const [isTypingMemberACL, setIsTypingMemberACL] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [confirmAclIdInput, setConfirmAclIdInput] = useState('');
  const [aclHasResources, setAclHasResources] = useState(false);
  const [checkingResources, setCheckingResources] = useState<boolean>(false);

  useEffect(() => {
    const fetchAclDetails = async () => {
      if (query.aclId) {
        try {
          const acl = await getAcl(query.aclId as string);
          setAclId(acl.id);
          setDescription(acl.description);
          setMemberUserIds(acl.memberUserIds);
          setMemberACLIds(acl.memberACLIds);
          setUpdaterACLId(acl.updaterACLId);
          setIsOpen(acl.isOpen);
          const hasResources = await hasAclAssociatedResources(acl.id);
          setAclHasResources(hasResources);
        } catch (e) {
          console.error('Error fetching ACL details:', e);
          setError('Failed to load ACL details.');
        }
      }
    };
    fetchAclDetails();
  }, [query.aclId]);

  const handleUpdaterACLIdBlur = async () => {
    let valid = !!updaterACLId;
    if (valid) valid = updaterACLId === aclId || (await isValid(updaterACLId));
    setIsUpdaterACLValid(valid);
  };

  const handleSubmit = async () => {
    setError('');
    const updatedAcl: UpdateACLRequest = {
      id: aclId,
      description,
      memberUserIds,
      memberACLIds,
      updaterACLId,
      isOpen,
    };
    try {
      await updateAcl(updatedAcl);
      router.replace(`/acl/${aclId}`);
    } catch (e: any) {
      console.error('Error updating ACL:', e);
      setError(e.response?.data?.message || 'Failed to update ACL.');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      if (aclHasResources && confirmAclIdInput.trim() !== aclId) {
        setDeleteError('Entered ACL ID does not match.');
        return;
      }
      await deleteAcl(aclId);
      setDeleteDialogOpen(false);
      setConfirmAclIdInput('');
      setDeleteError('');
      router.push('/acl');
    } catch (err: any) {
      console.error('Deletion error:', err);
      setDeleteError(err?.response?.data?.message || 'Deletion failed due to an unexpected error.');
    }
  };

  const handleOpenDelete = async () => {
    try {
      setCheckingResources(true);
      if (aclId) {
        const hasResourcesNow = await hasAclAssociatedResources(aclId);
        setAclHasResources(hasResourcesNow);
      }
      setConfirmAclIdInput('');
    } catch (e) {
      console.error('Error checking resources before delete:', e);
    } finally {
      setCheckingResources(false);
      setDeleteDialogOpen(true);
    }
  };

  return (
    <MainLayout>
      <Box
        sx={{
          m: '0 auto',
          maxWidth: '800px',
          p: '10px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <Typography fontSize={24} m="10px 0px">
          Update ACL
        </Typography>

        <TextField
          label="ACL ID"
          variant="outlined"
          value={aclId}
          disabled
          size="small"
          sx={{ mb: '20px' }}
          fullWidth
        />

        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          size="small"
          sx={{ mb: '20px' }}
          fullWidth
        />

        <AclAutocompleteSelector
          label="Add Member ID"
          fetchSuggestions={getUserSuggestions}
          values={memberUserIds}
          setValues={setMemberUserIds}
          errorMessage="Invalid or duplicate Member ID"
          onTypingChange={setIsTypingMemberId}
        />

        <AclAutocompleteSelector
          label="Add Member ACL"
          fetchSuggestions={getAclSuggestions}
          values={memberACLIds}
          setValues={setMemberACLIds}
          errorMessage="Invalid or duplicate ACL"
          onTypingChange={setIsTypingMemberACL}
        />

        <TextField
          label="Updater ACL"
          value={updaterACLId}
          onChange={(e) => setUpdaterACLId(e.target.value)}
          onBlur={handleUpdaterACLIdBlur}
          size="small"
          fullWidth
          error={!isUpdaterACLValid}
          helperText={!isUpdaterACLValid ? 'Updater ACL is invalid' : ''}
          sx={{ mb: 3 }}
        />

        <FormControlLabel
          control={<Checkbox checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} />}
          label="Is Open"
        />

        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}

        <Box display="flex" justifyContent="center" gap={2}>
          <Button
            variant="contained"
            sx={{ backgroundColor: 'primary.main', color: 'white' }}
            onClick={handleSubmit}
            disabled={isTypingMemberId || isTypingMemberACL}
          >
            Update
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={!checkingResources ? <Delete /> : undefined}
            onClick={handleOpenDelete}
            disabled={checkingResources}
          >
            {checkingResources ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <CircularProgress size={16} thickness={6} />
                Checking…
              </span>
            ) : (
              'Delete'
            )}
          </Button>
        </Box>
      </Box>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setConfirmAclIdInput('');
          setDeleteError('');
        }}
        onConfirm={handleDeleteConfirm}
        error={deleteError}
        aclId={aclId}
        showAclIdInput={aclHasResources}
        confirmAclIdInput={confirmAclIdInput}
        onConfirmAclIdInputChange={setConfirmAclIdInput}
      />
    </MainLayout>
  );
};
export default UpdateAcl;
