import QuizIcon from '@mui/icons-material/Quiz';
import {
  Box,
  Typography
} from '@mui/material';

interface Exam {
  examDate: string;
  examStartTime?: string;
  examEndTime?: string;
}

function Examdate({ exam }: { exam: Exam }) {
  const timeZone = 'Europe/Berlin';
  const hasTime = exam.examStartTime && exam.examEndTime;
  const start = new Date(`${exam.examDate}T${exam.examStartTime || '00:00'}:00+02:00`); //+02:00 is used because we assume Europe/Berlin time.
  const end = new Date(`${exam.examDate}T${exam.examEndTime || '00:00'}:00+02:00`);

  const formattedDate = start.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone,
  });

  const formattedStart = hasTime
    ? start.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
      })
    : '';

  const formattedEnd = hasTime
    ? end.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
      })
    : '';

  return (
    <Typography variant="body2" sx={{ color: '#e65100', mb: 1, fontWeight: 500 }}>
      🗓 {formattedDate}
      {hasTime && ` ⏰ ${formattedStart} – ${formattedEnd} (${timeZone})`}
    </Typography>
  );
}
export function ExamSchedule({ examDates }: { examDates: Exam[] }) {
  if (!examDates?.length) return null;

  return (
    <Box
      sx={{
        px: { xs: 1, sm: 2 },
        py: { xs: 1, sm: 1.5 },
        mt: 2,
        borderRadius: '8px',
        background: 'linear-gradient(135deg, #fff3e0, #ffe0b2)',
        border: '1px solid #ffcc80',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <QuizIcon sx={{ color: '#bf360c', fontSize: '20px' }} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#bf360c', fontSize: '1rem' }}>
          Exam Schedule
        </Typography>
      </Box>

      {examDates.map((exam, idx) => (
        <Examdate exam={exam} key={idx} />
      ))}
    </Box>
  );
}
