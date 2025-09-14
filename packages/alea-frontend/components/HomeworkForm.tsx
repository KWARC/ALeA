import { Box, Button, TextField, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';
import { getLocaleObject } from '../lang/utils';
import { QuizFileReader } from './QuizFileReader';
import { FTMLProblemWithSolution } from '@alea/spec';
import { FTML } from '@kwarc/ftml-viewer';
import { SafeHtml } from '@alea/react-utils';

const HomeworkForm = ({
  title,
  givenTs,
  setGivenTs,
  dueTs,
  setDueTs,
  feedbackReleaseTs,
  setFeedbackReleaseTs,
  setTitle,
  setCss,
  problems,
  setProblems,
  id,
  handleSave,
  resetForm,
}: {
  title?: string;
  givenTs: Date;
  setGivenTs: (value: Date) => void;
  dueTs: Date;
  setDueTs: (value: Date) => void;
  feedbackReleaseTs: Date;
  setFeedbackReleaseTs: (value: Date) => void;
  setTitle: (title: string) => void;
  setCss: (css: FTML.CSS[]) => void;
  problems: Record<string, FTMLProblemWithSolution>;
  setProblems: (problems: Record<string, FTMLProblemWithSolution>) => void;
  id: number | null;
  handleSave: () => void;
  resetForm: () => void;
}) => {
  const { homeworkManager: t } = getLocaleObject(useRouter());
  const isCreate = !id;
  return (
    <Box sx={{ width: '100%', mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        {isCreate ? t.createHomework : t.updateHomework}
      </Typography>
      {title && (
        <Box
          sx={{
            px: 1,
            color: '#888',
            border: '1px solid #AAA',
            borderRadius: '5px',
            fontWeight: 'bold',
            ':before': {
              content: '"Title"',
              display: 'block',
              fontSize: 'small',
              fontWeight: 'normal',
            },
          }}
        >
          <SafeHtml html={title} />
        </Box>
      )}
      <TextField
        label="Given Date"
        variant="outlined"
        fullWidth
        type="datetime-local"
        value={dayjs(givenTs).format('YYYY-MM-DDTHH:mm')}
        onChange={(e) => {
          const ts = dayjs(e.target.value).valueOf();
          setGivenTs(new Date(ts));
        }}
        sx={{ my: 1 }}
        InputLabelProps={{ shrink: true }}
      />

      <TextField
        label="Due Date"
        variant="outlined"
        fullWidth
        type="datetime-local"
        value={dayjs(dueTs).format('YYYY-MM-DDTHH:mm')}
        onChange={(e) => {
          const ts = dayjs(e.target.value).valueOf();
          setDueTs(new Date(ts));
        }}
        sx={{ my: 1 }}
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        label="Feedback Release Date"
        variant="outlined"
        fullWidth
        type="datetime-local"
        value={dayjs(feedbackReleaseTs).format('YYYY-MM-DDTHH:mm')}
        onChange={(e) => {
          const ts = dayjs(e.target.value).valueOf();
          setFeedbackReleaseTs(new Date(ts));
        }}
        sx={{ my: 1 }}
        InputLabelProps={{ shrink: true }}
      />

      <QuizFileReader setCss={setCss} setTitle={setTitle} setProblems={setProblems} />
      {<i>{Object.keys(problems ?? {}).length} problems found.</i>}
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Button variant="contained" color="primary" onClick={handleSave}>
          {isCreate ? t.saveHomework : t.updateHomework}
        </Button>
        <Button variant="outlined" onClick={resetForm}>
          {t.cancel}
        </Button>
      </Box>
    </Box>
  );
};

export default HomeworkForm;
