import EditIcon from '@mui/icons-material/Edit';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Language, UserProfile, updateUserProfile } from '@stex-react/api';
import { isFauId } from '@stex-react/utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getLocaleObject } from '../../lang/utils';

export function EditProfileDialog({ open, onClose, profileData, userId, onSave }) {
  const router = useRouter();
  const { myProfile: t } = getLocaleObject(router);
  const [formData, setFormData] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    email: '',
    studyProgram: '',
    semester: '',
    languages: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profileData) {
      setFormData({
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        studyProgram: profileData.studyProgram || '',
        email: profileData.email || '',
        semester: profileData.semester || '',
        languages: profileData.languages || '',
      });
    }
  }, [profileData]);

  useEffect(() => {
    if (!profileData) return;

    const isDifferent =
      profileData.firstName !== formData.firstName ||
      profileData.lastName !== formData.lastName ||
      profileData.email !== formData.email ||
      profileData.studyProgram !== formData.studyProgram ||
      profileData.semester !== formData.semester ||
      profileData.languages !== formData.languages;

    setHasChanges(isDifferent);
  }, [formData, profileData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const isFAUId = isFauId(userId);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    if (!userId) {
      setError('User ID is missing. Please refresh the page and try again.');
      setIsLoading(false);
      return;
    }

    const updatedProfile = {
      userId,
      ...formData,
    };

    try {
      await updateUserProfile(
        updatedProfile.userId,
        updatedProfile.firstName,
        updatedProfile.lastName,
        updatedProfile.email,
        updatedProfile.studyProgram,
        updatedProfile.semester,
        updatedProfile.languages
      );
      onSave(updatedProfile);
      onClose();
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const semesterOptions = [
    'SS16',
    'WS16-17',
    'SS17',
    'WS17-18',
    'SS18',
    'WS18-19',
    'SS19',
    'WS19-20',
    'SS20',
    'WS20-21',
    'SS21',
    'WS21-22',
    'SS22',
    'WS22-23',
    'SS23',
    'WS23-24',
    'SS24',
    'WS24-25',
    'SS25',
    'WS25-26',
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'primary.light', color: 'white' }}>Edit Profile</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
          <TextField
            fullWidth
            label={t.firstName}
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            variant="outlined"
            disabled={isFAUId}
          />
          <TextField
            fullWidth
            label={t.lastName}
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            variant="outlined"
            disabled={isFAUId}
          />
          <TextField
            fullWidth
            label={t.email}
            name="email"
            value={formData.email}
            onChange={handleChange}
            variant="outlined"
          />
          <TextField
            fullWidth
            label={t.studyProgram}
            name="studyProgram"
            value={formData.studyProgram}
            onChange={handleChange}
            variant="outlined"
          />
          <FormControl fullWidth variant="outlined">
            <InputLabel>{t.semester}</InputLabel>
            <Select
              name="semester"
              value={formData.semester}
              onChange={handleChange}
              label={t.semester}
            >
              <MenuItem value="">
                <em>Select a semester</em>
              </MenuItem>
              {semesterOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ mb: '0.5rem' }} fullWidth>
            <InputLabel id="language-label">{t.languages}</InputLabel>
            <Select
              labelId="language-label"
              id="language-select"
              value={formData.languages ? formData.languages.split(',') : []}
              multiple
              label={t.languages}
              variant="outlined"
              onChange={(e) => {
                const languages = (e.target.value as string[]).join(',');
                setFormData((prev) => ({ ...prev, languages }));
              }}
              renderValue={(selected) => (selected as string[]).join(', ')}
              fullWidth
            >
              {Object.keys(Language).map((key) => (
                <MenuItem key={key} value={key}>
                  <Checkbox checked={formData.languages.includes(key)} />
                  <ListItemText primary={Language[key]} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={isLoading || !hasChanges}
          startIcon={<EditIcon />}
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
