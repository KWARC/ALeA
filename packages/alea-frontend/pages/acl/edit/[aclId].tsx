import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  TextField,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import AccountCircle from '@mui/icons-material/AccountCircle';
import GroupIcon from '@mui/icons-material/Group';
import { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../../layouts/MainLayout';
import {
  UpdateACLRequest,
  getAcl,
  isValid,
  updateAcl,
  deleteAcl,
  hasAclAssociatedResources,
} from '@stex-react/api';
import { ConfirmationDialog } from '../edit/ConfirmationDialog';

const UpdateAcl: NextPage = () => {
  const router = useRouter();
  const { query } = router;
  const [aclId, setAclId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [memberUserIds, setMemberUserIds] = useState<string[]>([]);
  const [memberACLIds, setMemberACLIds] = useState<string[]>([]);
  const [updaterACLId, setUpdaterACLId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [tempMemberUserId, setTempMemberUserId] = useState<string>('');
  const [tempMemberACL, setTempMemberACL] = useState<string>('');
  const [isInvalid, setIsInvalid] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isUpdaterACLValid, setIsUpdaterACLValid] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
        } catch (e) {
          console.error('Error fetching ACL details:', e);
          setError('Failed to load ACL details.');
        }
      }
    };
    fetchAclDetails();
  }, [query.aclId]);

  const handleAddMemberId = (
    event: React.KeyboardEvent<HTMLElement> | React.MouseEvent<HTMLElement>
  ) => {
    if (!tempMemberUserId) return;
    if (isEnterKeyEvent(event) || event.type === 'click') {
      setMemberUserIds([...memberUserIds, tempMemberUserId]);
      setTempMemberUserId('');
    }
  };

  function isEnterKeyEvent(
    event: React.KeyboardEvent<HTMLElement> | React.MouseEvent<HTMLElement>
  ) {
    return event.type === 'keydown' && (event as React.KeyboardEvent).key === 'Enter';
  }

  const handleRemoveMemberId = (idToRemove: string) => {
    setMemberUserIds(memberUserIds.filter((id) => id !== idToRemove));
  };

  const handleAddMemberACL = async (
    event: React.KeyboardEvent<HTMLElement> | React.MouseEvent<HTMLElement>
  ) => {
    if (isEnterKeyEvent(event) || event.type === 'click') {
      const res = await isValid(tempMemberACL);
      if (tempMemberACL && res) {
        setMemberACLIds([...memberACLIds, tempMemberACL]);
        setTempMemberACL('');
        setIsInvalid('');
      } else {
        setIsInvalid(`${tempMemberACL} is not a valid ACL.`);
      }
    }
  };

  const handleRemoveMemberACL = (aclToRemove: string) => {
    setMemberACLIds(memberACLIds.filter((acl) => acl !== aclToRemove));
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

  const handleUpdaterACLIdBlur = async () => {
    let isValidUpdater = !!updaterACLId;
    if (isValidUpdater) {
      isValidUpdater = updaterACLId === aclId || (await isValid(updaterACLId));
    }
    setIsUpdaterACLValid(isValidUpdater);
  };

  const handleDeleteClick = () => {
    setDeleteError('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDeleteError('');
  };

  const handleDeleteConfirm = async () => {
    setDeleteError('');
    if (!aclId) {
      setDeleteError('ACL ID missing. Deletion aborted.');
      return;
    }
    try {
      if (await hasAclAssociatedResources(aclId)) {
        setDeleteError('ACL is linked to resources. Cannot delete.');
        return;
      }
      await deleteAcl(aclId);
      setDeleteDialogOpen(false);
      router.push('/acl');
    } catch (err: any) {
      console.error('Deletion error:', err);
      setDeleteError(err?.response?.data?.message || 'Deletion failed due to an unexpected error.');
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
          variant="outlined"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          size="small"
          sx={{ mb: '20px' }}
          fullWidth
        />

        <Box mb="20px">
          <TextField
            label="Add Member ID"
            variant="outlined"
            size="small"
            value={tempMemberUserId}
            onChange={(e) => setTempMemberUserId(e.target.value)}
            onKeyDown={handleAddMemberId}
            sx={{ mb: '10px' }}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton onClick={handleAddMemberId}>
                    <AccountCircle />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {memberUserIds.map((id, index) => (
              <Chip key={index} label={id} onDelete={() => handleRemoveMemberId(id)} />
            ))}
          </Box>
        </Box>

        <Box mb="20px">
          <TextField
            label="Add Member ACL"
            variant="outlined"
            size="small"
            value={tempMemberACL}
            onChange={(e) => setTempMemberACL(e.target.value)}
            onKeyDown={handleAddMemberACL}
            sx={{ mb: '10px' }}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton onClick={handleAddMemberACL}>
                    <GroupIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {isInvalid && <Typography color="error">{isInvalid}</Typography>}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {memberACLIds.map((acl, index) => (
              <Chip key={index} label={acl} onDelete={() => handleRemoveMemberACL(acl)} />
            ))}
          </Box>
        </Box>

        <TextField
          label="Updater ACL"
          variant="outlined"
          value={updaterACLId}
          onChange={(e) => setUpdaterACLId(e.target.value)}
          onBlur={handleUpdaterACLIdBlur}
          size="small"
          sx={{ mb: '20px' }}
          fullWidth
          error={isUpdaterACLValid === false}
          helperText={isUpdaterACLValid === false ? 'Updater ACL is invalid' : ''}
        />

        <FormControlLabel
          control={<Checkbox checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} />}
          label="Is Open"
          sx={{ mb: '20px' }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            gap: '16px',
          }}
        >
          <Button
            variant="contained"
            sx={{ backgroundColor: '#203360', color: '#ffffff', mb: 2 }}
            onClick={handleSubmit}
            disabled={!aclId || !updaterACLId || !isUpdaterACLValid}
          >
            Update
          </Button>

          <Button
            variant="contained"
            color="error"
            startIcon={<Delete />}
            onClick={handleDeleteClick}
            sx={{ mb: 2 }}
          >
            Delete
          </Button>
        </Box>
      </Box>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        error={deleteError}
        aclId={aclId}
      />
    </MainLayout>
  );
};
export default UpdateAcl;