import {
  CreateACLRequest,
  createAcl,
  getAclSuggestions,
  getUserSuggestions,
  isValid,
} from '@alea/spec';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useState } from 'react';
import AclAutocompleteSelector from '../../components/AclAutocompleteSelector';
import MainLayout from '../../layouts/MainLayout';

const CreateACl: NextPage = () => {
  const [aclId, setAclId] = useState<string | ''>('');
  const [description, setDescription] = useState<string | ''>('');
  const [memberUserIds, setMemberUserIds] = useState<string[]>([]);
  const [memberACLIds, setMemberACLIds] = useState<string[]>([]);
  const [updaterACLId, setUpdaterACLId] = useState<string | ''>('');
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string>('');
  const [isUpdaterACLValid, setIsUpdaterACLValid] = useState<boolean>(true);
  const [isTypingMemberId, setIsTypingMemberId] = useState(false);
  const [isTypingMemberACL, setIsTypingMemberACL] = useState(false);

  const router = useRouter();

  const handleSubmit = async () => {
    setError('');
    const newAcl: CreateACLRequest = {
      id: aclId,
      description,
      memberUserIds,
      memberACLIds,
      updaterACLId,
      isOpen,
    };
    try {
      await createAcl(newAcl);
      router.replace(`/acl/${aclId}`);
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  };

  const handleUpdaterACLIdBlur = async () => {
    let isValidUpdater = !!updaterACLId;
    if (isValidUpdater) {
      isValidUpdater = updaterACLId === aclId || (await isValid(updaterACLId));
    }
    setIsUpdaterACLValid(isValidUpdater);
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
          Create ACL
        </Typography>
        <TextField
          label="ACL ID"
          variant="outlined"
          value={aclId}
          onChange={(e) => setAclId(e.target.value)}
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
        <AclAutocompleteSelector
          label="Add Member ID"
          fetchSuggestions={getUserSuggestions}
          values={memberUserIds}
          setValues={setMemberUserIds}
          errorMessage="Invalid or duplicate Member ID"
          onTypingChange={(b) => setIsTypingMemberId(b)}
        />

        <AclAutocompleteSelector
          label="Add Member ACL"
          fetchSuggestions={getAclSuggestions}
          values={memberACLIds}
          setValues={setMemberACLIds}
          chipLabel={(id) => id}
          errorMessage="Invalid or duplicate Member ACL"
          onTypingChange={(b) => setIsTypingMemberACL(b)}
        />

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
        {error && <Alert severity="error">{'Something went wrong'}</Alert>}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={
              !aclId || !updaterACLId || !isUpdaterACLValid || isTypingMemberId || isTypingMemberACL
            }
          >
            Create
          </Button>
        </Box>
      </Box>
    </MainLayout>
  );
};

export default CreateACl;
