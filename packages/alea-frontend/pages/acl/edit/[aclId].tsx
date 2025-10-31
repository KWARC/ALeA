import {
  AutocompleteAclSuggestion,
  AutocompleteUserSuggestion,
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
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

  const [tempMemberUserId, setTempMemberUserId] = useState('');
  const [tempMemberACL, setTempMemberACL] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<AutocompleteUserSuggestion[]>([]);
  const [aclSuggestions, setAclSuggestions] = useState<AutocompleteAclSuggestion[]>([]);

  const [memberIdAddStatus, setMemberIdAddStatus] = useState<'initial' | 'success' | 'failure'>(
    'initial'
  );
  const [memberACLAddStatus, setMemberACLAddStatus] = useState<'initial' | 'success' | 'failure'>(
    'initial'
  );
  const [isTypingMemberId, setIsTypingMemberId] = useState(false);
  const [isTypingMemberACL, setIsTypingMemberACL] = useState(false);

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

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (tempMemberUserId.trim().length > 0) {
        try {
          const results = await getUserSuggestions(tempMemberUserId);
          setUserSuggestions(results);
        } catch (e) {
          console.error('Error fetching user suggestions:', e);
        }
      } else setUserSuggestions([]);
    }, 300);
    return () => clearTimeout(handler);
  }, [tempMemberUserId]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (tempMemberACL.trim()) {
        try {
          const results = await getAclSuggestions(tempMemberACL);
          setAclSuggestions(results);
        } catch (e) {
          console.error('Error fetching ACL suggestions:', e);
        }
      } else setAclSuggestions([]);
    }, 300);
    return () => clearTimeout(handler);
  }, [tempMemberACL]);

  const resetStatus = useCallback((setter: React.Dispatch<React.SetStateAction<any>>) => {
    const timer = setTimeout(() => setter('initial'), 2000);
    return () => clearTimeout(timer);
  }, []);

  function isEnterKeyEvent(
    event: React.KeyboardEvent<HTMLElement> | React.MouseEvent<HTMLElement>
  ) {
    return event.type === 'keydown' && (event as React.KeyboardEvent).key === 'Enter';
  }

  const handleAddMemberId = useCallback(
    (event: React.KeyboardEvent<HTMLElement> | React.MouseEvent<HTMLElement>) => {
      if (!tempMemberUserId) return;
      if (isEnterKeyEvent(event) || event.type === 'click') {
        const idToAdd = tempMemberUserId.trim();
        if (idToAdd && !memberUserIds.includes(idToAdd)) {
          setMemberUserIds([...memberUserIds, idToAdd]);
          setTempMemberUserId('');
          setMemberIdAddStatus('success');
        } else {
          setMemberIdAddStatus('failure');
        }
        resetStatus(setMemberIdAddStatus);
      }
    },
    [tempMemberUserId, memberUserIds, resetStatus]
  );

  const handleAddMemberACL = useCallback(
    (event: React.KeyboardEvent<HTMLElement> | React.MouseEvent<HTMLElement>) => {
      if (!tempMemberACL) return;
      if (isEnterKeyEvent(event) || event.type === 'click') {
        const aclToAdd = tempMemberACL.trim();
        if (aclToAdd && !memberACLIds.includes(aclToAdd)) {
          setMemberACLIds([...memberACLIds, aclToAdd]);
          setTempMemberACL('');
          setMemberACLAddStatus('success');
        } else {
          setMemberACLAddStatus('failure');
        }
        resetStatus(setMemberACLAddStatus);
      }
    },
    [tempMemberACL, memberACLIds, resetStatus]
  );

  const handleRemoveMemberId = (id: string) =>
    setMemberUserIds(memberUserIds.filter((u) => u !== id));

  const handleRemoveMemberACL = (acl: string) =>
    setMemberACLIds(memberACLIds.filter((a) => a !== acl));

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
  const isUpdateDisabled = useMemo(
    () => !aclId || !updaterACLId || !isUpdaterACLValid || !!tempMemberUserId || !!tempMemberACL,
    [aclId, updaterACLId, isUpdaterACLValid, tempMemberUserId, tempMemberACL]
  );

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

        <Box mb="20px">
          <Autocomplete
            freeSolo
            options={userSuggestions}
            getOptionLabel={(opt) =>
              typeof opt === 'string' ? opt : `${opt.FirstName} (${opt.userId})`
            }
            inputValue={tempMemberUserId}
            onInputChange={(_, v) => {
              setTempMemberUserId(v);
              setIsTypingMemberId(true);
              if (memberIdAddStatus !== 'initial') setMemberIdAddStatus('initial');
            }}
            onChange={(_, val) => {
              if (val && typeof val !== 'string') {
                setTempMemberUserId(val.userId);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Add Member ID"
                size="small"
                onKeyDown={handleAddMemberId}
                helperText={
                  tempMemberUserId && !isTypingMemberId ? 'Press Enter to add or clear field' : ''
                }
                error={!!tempMemberUserId && !isTypingMemberId}
              />
            )}
          />
          <Stack spacing={1} mt={1}>
            {memberIdAddStatus === 'success' && (
              <Alert variant="outlined" severity="success">
                Member ID added successfully
              </Alert>
            )}
            {memberIdAddStatus === 'failure' && (
              <Alert variant="outlined" severity="error">
                Invalid or duplicate Member ID
              </Alert>
            )}
          </Stack>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {memberUserIds.map((id) => (
              <Tooltip title={id} arrow key={id}>
                <Chip label={id} onDelete={() => handleRemoveMemberId(id)} />
              </Tooltip>
            ))}
          </Box>
        </Box>

        <Box mb={3}>
          <Autocomplete
            freeSolo
            options={aclSuggestions}
            getOptionLabel={(opt) =>
              typeof opt === 'string' ? opt : `${opt.description} (${opt.id})`
            }
            inputValue={tempMemberACL}
            onInputChange={(_, v) => {
              setTempMemberACL(v);
              setIsTypingMemberACL(true);
              if (memberACLAddStatus !== 'initial') setMemberACLAddStatus('initial');
            }}
            onChange={(_, val) => {
              if (val && typeof val !== 'string') {
                setTempMemberACL(val.id);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Add Member ACL"
                size="small"
                onKeyDown={handleAddMemberACL}
                helperText={
                  tempMemberACL && !isTypingMemberACL ? 'Press Enter to add or clear field' : ''
                }
                error={!!tempMemberACL && !isTypingMemberACL}
              />
            )}
          />
          <Stack spacing={1} mt={1}>
            {memberACLAddStatus === 'success' && (
              <Alert variant="outlined" severity="success">
                Member ACL added successfully
              </Alert>
            )}
            {memberACLAddStatus === 'failure' && (
              <Alert variant="outlined" severity="error">
                Invalid or duplicate Member ACL
              </Alert>
            )}
          </Stack>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {memberACLIds.map((acl) => (
              <Tooltip title={acl} arrow key={acl}>
                <Chip label={acl} onDelete={() => handleRemoveMemberACL(acl)} />
              </Tooltip>
            ))}
          </Box>
        </Box>

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
            sx={{ backgroundColor: '#203360', color: 'white' }}
            onClick={handleSubmit}
            disabled={isUpdateDisabled}
          >
            Update
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<Delete />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete
          </Button>
        </Box>
      </Box>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        error={deleteError}
        aclId={aclId}
      />
    </MainLayout>
  );
};
export default UpdateAcl;
