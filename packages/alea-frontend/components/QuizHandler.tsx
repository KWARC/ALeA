import { OpenInNew } from '@mui/icons-material';
import QuizIcon from '@mui/icons-material/Quiz';
import { Box, Button, Chip, Typography } from '@mui/material';
import { QuizWithStatus } from '@alea/spec';
import { convertHtmlStringToPlain, LectureEntry } from '@alea/utils';

interface QuizHandlerProps {
  currentEntry: LectureEntry;
  quiz: QuizWithStatus | null;
}

export default function QuizHandler({ currentEntry, quiz }: QuizHandlerProps) {
  const formatQuizLink = (courseId: string, quizId: string) =>
    `/instructor-dash/${courseId}?tab=quiz-dashboard&quizId=${quizId}`;

  if (quiz) {
    return (
      <Button
        variant="outlined"
        size="small"
        color="primary"
        endIcon={<OpenInNew fontSize="small" />}
        sx={{ textTransform: 'none', px: 0.5 }}
        component="a"
        target="_blank"
        href={formatQuizLink(quiz.courseId, quiz.id)}
        rel="noopener noreferrer"
      >
        <Box
          sx={{
            textTransform: 'none',
            maxWidth: '60px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {convertHtmlStringToPlain(quiz.title)}
        </Box>
      </Button>
    );
  }

  if (currentEntry.isQuizScheduled) {
    return <Chip icon={<QuizIcon />} label="Scheduled" size="small" color="warning" />;
  }

  return (
    <Typography variant="body2" color="text.secondary">
      <i>-</i>
    </Typography>
  );
}
