import { formatExamLabelDropdown, formatExamLabelFull } from '@alea/spec';
import { Theme } from '@emotion/react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Typography,
  SxProps,
} from '@mui/material';

interface ExamInfo {
  uri: string;
  term?: string;
  number?: string;
  date?: string;
}

interface ExamSelectProps {
  exams: ExamInfo[];
  courseId?: string;
  value: string;
  onChange: (examUri: string) => void;
  label?: string;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

export function ExamSelect({
  exams,
  courseId,
  value,
  onChange,
  label = 'Appeared in exams',
  size = 'small',
  sx,
}: ExamSelectProps) {
  if (!exams.length) return null;

  return (
    <FormControl size={size} sx={{ minWidth: 220 }}>
      <InputLabel>{label}</InputLabel>

      <Select
        size="small"
        value={value}
        label={label}
        onChange={(e) => onChange(e.target.value as string)}
      >
        <MenuItem disabled value="">
          <em>Select exam</em>
        </MenuItem>

        {exams.map((exam) => {
          const dropdownLabel = formatExamLabelDropdown(exam.uri, exam, courseId);
          const fullLabel = formatExamLabelFull(exam.uri, exam, courseId);

          return (
            <MenuItem key={exam.uri} value={exam.uri}>
              <Tooltip title={fullLabel} placement="right" arrow>
                <Typography noWrap sx={{ maxWidth: 300 }}>
                  {dropdownLabel}
                </Typography>
              </Tooltip>
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
}
