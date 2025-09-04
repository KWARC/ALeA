import { InfoOutlined } from '@mui/icons-material';
import {
  Box,
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Tooltip,
} from '@mui/material';
import { Days, Languages, MeetType, StudyBuddy, getUserInfo } from '@stex-react/spec';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getLocaleObject } from '../lang/utils';

export function StudyBuddyForm({
  studyBuddy,
  onUpdate,
}: {
  studyBuddy: StudyBuddy;
  onUpdate: (studyBuddy: StudyBuddy) => void;
}) {
  const { studyBuddy: t } = getLocaleObject(useRouter());
  const [userName, setUserName] = useState('');
  useEffect(() => {
    getUserInfo().then((u) => setUserName(u.fullName));
  }, []);
  return (
    <Box>
      <TextField label={t.nameLabel} value={userName} />
      <Box display="flex" alignItems="center">
        <TextField
          error={!studyBuddy.email?.includes('@')}
          label={t.emailLabel}
          variant="outlined"
          value={studyBuddy.email}
          onChange={(e) => onUpdate({ ...studyBuddy, email: e.target.value })}
          required
          sx={{ my: '0.5rem', mr: '0.5rem' }}
          inputProps={{ maxLength: 250 }}
          fullWidth
        />
        <Tooltip title={<span style={{ fontSize: 'medium' }}>{t.emailWarning}</span>}>
          <InfoOutlined />
        </Tooltip>
      </Box>
      <TextField
        label={t.introLabel}
        variant="outlined"
        value={studyBuddy.intro}
        onChange={(e) => {
          onUpdate({ ...studyBuddy, intro: e.target.value });
        }}
        sx={{ mb: '0.5rem' }}
        inputProps={{ maxLength: 1000 }}
        fullWidth
      />
      <TextField
        label={t.studyProgramLabel}
        variant="outlined"
        value={studyBuddy.studyProgram}
        onChange={(e) => {
          onUpdate({ ...studyBuddy, studyProgram: e.target.value });
        }}
        sx={{ mb: '0.5rem' }}
        inputProps={{ maxLength: 250 }}
        fullWidth
      />
      <FormControl sx={{ mb: '0.5rem' }} fullWidth>
        <InputLabel id="semester-label">{t.semesterLabel}</InputLabel>
        <Select
          labelId="semester-label"
          id="semester-select"
          value={studyBuddy.semester}
          label="Semester #"
          onChange={(e) => {
            onUpdate({ ...studyBuddy, semester: +e.target.value });
          }}
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((sem) => (
            <MenuItem key={sem} value={sem}>
              {sem}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl sx={{ mb: '0.5rem' }} fullWidth>
        <InputLabel id="meet-type-label">{t.meetTypeLabel}</InputLabel>
        <Select
          labelId="meet-type-label"
          id="meet-type-select"
          label={t.meetTypeLabel}
          value={studyBuddy.meetType}
          variant="outlined"
          onChange={(e) => {
            const meetType = MeetType[e.target.value as keyof typeof MeetType];
            onUpdate({ ...studyBuddy, meetType });
          }}
          fullWidth
        >
          {Object.keys(MeetType).map((key) => (
            <MenuItem key={key} value={key}>
              {MeetType[key]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl sx={{ mb: '0.5rem' }} fullWidth>
        <InputLabel id="days-label">{t.preferredDays}</InputLabel>
        <Select
          labelId="days-label"
          id="days-select"
          value={studyBuddy.dayPreference ? studyBuddy.dayPreference.split(',') : []}
          multiple
          label={t.preferredDays}
          variant="outlined"
          onChange={(e) => {
            const dayPreference = (e.target.value as string[]).join(',');
            onUpdate({ ...studyBuddy, dayPreference });
          }}
          renderValue={(selected) => selected.join(', ')}
          fullWidth
        >
          {Object.keys(Days).map((key) => (
            <MenuItem key={key} value={key}>
              <Checkbox checked={studyBuddy.dayPreference.includes(key)} />
              <ListItemText primary={Days[key]} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ mb: '0.5rem' }} fullWidth>
        <InputLabel id="language-label">{t.languagesLabel}</InputLabel>
        <Select
          labelId="language-label"
          id="language-select"
          value={studyBuddy.languages ? studyBuddy.languages.split(',') : []}
          multiple
          label={t.languagesLabel}
          variant="outlined"
          onChange={(e) => {
            const languages = (e.target.value as string[]).join(',');
            onUpdate({ ...studyBuddy, languages });
          }}
          renderValue={(selected) => selected.join(', ')}
          fullWidth
        >
          {Object.keys(Languages).map((key) => (
            <MenuItem key={key} value={key}>
              <Checkbox checked={studyBuddy.languages.includes(key)} />
              <ListItemText primary={Languages[key]} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
