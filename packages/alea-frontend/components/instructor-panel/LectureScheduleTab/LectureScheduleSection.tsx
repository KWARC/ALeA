import {
  Box,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Tooltip,
  TextField,
  Checkbox,
  Button,
  MenuItem,
  FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { LectureSchedule } from '@alea/spec';

interface Props {
  type: 'lecture' | 'tutorial';
  t: any;
  timezone?: string;
  weekdayOptions: string[];
  hasHomework: boolean;
  scheduleData: LectureSchedule;
  setScheduleData: (data: LectureSchedule) => void;
  scheduleList: LectureSchedule[];
  onFieldChange: (field: keyof LectureSchedule, value: string | boolean) => void;
  onAdd: () => void;
  onEdit: (entry: LectureSchedule) => void;
  onDelete: (entry: LectureSchedule) => void;
}

const LectureScheduleSection: React.FC<Props> = ({
  type,
  t,
  timezone,
  weekdayOptions,
  hasHomework,
  scheduleData,
  scheduleList,
  onFieldChange,
  onAdd,
  onEdit,
  onDelete,
}) => {
  return (
    <>
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select
            label={t.day}
            value={scheduleData.lectureDay}
            onChange={(e) => onFieldChange('lectureDay', e.target.value)}
            size="small"
            sx={{ width: 140 }}
          >
            {weekdayOptions.map((day) => (
              <MenuItem key={day} value={day}>
                {day}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label={t.venue}
            value={scheduleData.venue}
            onChange={(e) => onFieldChange('venue', e.target.value)}
            size="small"
            sx={{ width: 120 }}
          />

          <TextField
            label={t.venueLink}
            value={scheduleData.venueLink}
            onChange={(e) => onFieldChange('venueLink', e.target.value)}
            size="small"
            sx={{ width: 140 }}
          />

          <TextField
            label={t.startTime}
            type="time"
            value={scheduleData.lectureStartTime}
            onChange={(e) => onFieldChange('lectureStartTime', e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ width: 110 }}
          />

          <TextField
            label={t.endTime}
            type="time"
            value={scheduleData.lectureEndTime}
            onChange={(e) => onFieldChange('lectureEndTime', e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ width: 110 }}
          />

          {type === 'lecture' && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={scheduleData.hasQuiz}
                  onChange={(e) => onFieldChange('hasQuiz', e.target.checked)}
                />
              }
              label={t.quiz}
              sx={{ m: 0 }}
            />
          )}

          <Button
            variant="contained"
            size="small"
            onClick={onAdd}
            sx={{
              px: 2,
              py: 0.5,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <AddIcon fontSize="small" />
            {type === 'lecture' ? 'Add Lecture' : 'Add Tutorial'}
          </Button>
        </Box>
      </Paper>

      <Table
        size="small"
        sx={{
          mt: 1,
          backgroundColor: '#fafbfc',
          '& thead': { backgroundColor: '#f5f7fa' },
          '& tbody tr:hover': { backgroundColor: '#f0f4ff' },
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell>{t.day}</TableCell>
            <TableCell>
              {t.startTime} {timezone && `(${timezone})`}
            </TableCell>
            <TableCell>
              {t.endTime} {timezone && `(${timezone})`}
            </TableCell>
            <TableCell>{t.venue}</TableCell>
            <TableCell>{t.venueLink}</TableCell>

            {type === 'lecture' && (
              <>
                <TableCell>{t.homework || 'Homework'}</TableCell>
                <TableCell>{t.quiz}</TableCell>
              </>
            )}

            <TableCell>{t.actions}</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {scheduleList.map((entry, idx) => (
            <TableRow key={idx}>
              <TableCell>{entry.lectureDay}</TableCell>
              <TableCell>{entry.lectureStartTime}</TableCell>
              <TableCell>{entry.lectureEndTime}</TableCell>
              <TableCell>{entry.venue}</TableCell>
              <TableCell>
                <a href={entry.venueLink} target="_blank" rel="noreferrer">
                  {t.link}
                </a>
              </TableCell>
              {type === 'lecture' && (
                <>
                  <TableCell>{hasHomework ? t.yes : t.no}</TableCell>
                  <TableCell>{entry.hasQuiz ? t.yes : t.no}</TableCell>
                </>
              )}
              <TableCell>
                <Tooltip title={t.edit}>
                  <IconButton size="small" onClick={() => onEdit(entry)}>
                    <EditIcon fontSize="small" color="primary" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t.delete}>
                  <IconButton size="small" onClick={() => onDelete(entry)}>
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
};

export default LectureScheduleSection;
