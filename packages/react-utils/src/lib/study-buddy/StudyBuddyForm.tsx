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
import { Days, Languages, MeetType, StudyBuddy } from '@alea/spec';
import { defaultStudyBuddyLabels, type StudyBuddyLabels } from './labels';

export function StudyBuddyForm({
  studyBuddy,
  userName,
  labels = defaultStudyBuddyLabels,
  onUpdate,
}: {
  studyBuddy: StudyBuddy;
  userName: string;
  labels?: StudyBuddyLabels;
  onUpdate: (studyBuddy: StudyBuddy) => void;
}) {
  return (
    <Box>
      <TextField label={labels.nameLabel} value={userName} />
      <Box display="flex" alignItems="center">
        <TextField
          error={!studyBuddy.email?.includes('@')}
          label={labels.emailLabel}
          variant="outlined"
          value={studyBuddy.email}
          onChange={(e) => onUpdate({ ...studyBuddy, email: e.target.value })}
          required
          sx={{ my: '0.5rem', mr: '0.5rem' }}
          inputProps={{ maxLength: 250 }}
          fullWidth
        />
        <Tooltip title={<span style={{ fontSize: 'medium' }}>{labels.emailWarning}</span>}>
          <InfoOutlined />
        </Tooltip>
      </Box>
      <TextField
        label={labels.introLabel}
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
        label={labels.studyProgramLabel}
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
        <InputLabel id="semester-label">{labels.semesterLabel}</InputLabel>
        <Select
          labelId="semester-label"
          id="semester-select"
          value={studyBuddy.semester}
          label={labels.semesterLabel}
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
        <InputLabel id="meet-type-label">{labels.meetTypeLabel}</InputLabel>
        <Select
          labelId="meet-type-label"
          id="meet-type-select"
          label={labels.meetTypeLabel}
          value={studyBuddy.meetType}
          variant="outlined"
          onChange={(e) => {
            const meetType = e.target.value as MeetType;
            onUpdate({ ...studyBuddy, meetType });
          }}
          fullWidth
        >
          {Object.values(MeetType).map((meetType) => (
            <MenuItem key={meetType} value={meetType}>
              {meetType}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl sx={{ mb: '0.5rem' }} fullWidth>
        <InputLabel id="days-label">{labels.preferredDays}</InputLabel>
        <Select
          labelId="days-label"
          id="days-select"
          value={studyBuddy.dayPreference ? studyBuddy.dayPreference.split(',') : []}
          multiple
          label={labels.preferredDays}
          variant="outlined"
          onChange={(e) => {
            const dayPreference = (e.target.value as string[]).join(',');
            onUpdate({ ...studyBuddy, dayPreference });
          }}
          renderValue={(selected) => selected.join(', ')}
          fullWidth
        >
          {Object.values(Days).map((day) => (
            <MenuItem key={day} value={day}>
              <Checkbox checked={studyBuddy.dayPreference.includes(day)} />
              <ListItemText primary={day} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ mb: '0.5rem' }} fullWidth>
        <InputLabel id="language-label">{labels.languagesLabel}</InputLabel>
        <Select
          labelId="language-label"
          id="language-select"
          value={studyBuddy.languages ? studyBuddy.languages.split(',') : []}
          multiple
          label={labels.languagesLabel}
          variant="outlined"
          onChange={(e) => {
            const languages = (e.target.value as string[]).join(',');
            onUpdate({ ...studyBuddy, languages });
          }}
          renderValue={(selected) => selected.join(', ')}
          fullWidth
        >
          {Object.values(Languages).map((language) => (
            <MenuItem key={language} value={language}>
              <Checkbox checked={studyBuddy.languages.includes(language)} />
              <ListItemText primary={language} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
