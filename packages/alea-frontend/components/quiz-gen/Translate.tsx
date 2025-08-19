import {
  Box,
  Button,
  Collapse,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { QuizProblem } from '@stex-react/api';
import { useState } from 'react';
import { FlatQuizProblem } from '../../pages/quiz-gen';

interface TranslateProps {
  problemData?: FlatQuizProblem;
  onTranslated?: (newVariant: QuizProblem) => void;
  onLoadingChange?: (loading: boolean) => void;
}

const LANGUAGES = [
  { code: 'de', name: 'German' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'zh', name: 'Chinese' },
];

export const Translate = ({ problemData, onTranslated, onLoadingChange }: TranslateProps) => {
  const [active, setActive] = useState(false);
  const [targetLang, setTargetLang] = useState('en');
  const [instruction, setInstruction] = useState('');

  const handleGenerate = async () => {
    if (!problemData?.problemId) return;
    onLoadingChange?.(true);
    // try {
    //   const result = await generateQuizProblems({
    //     mode: 'variant',
    //     problemId: problemData.problemId,
    //     variantType: 'translate',
    //     targetLang,
    //     instruction,
    //   });
    //   if (result.length > 0) {
    //     onTranslated?.(result[0]);
    //   }
    // } finally {
    //   onLoadingChange?.(false);
    // }
  };

  return (
    <Box
      mb={2}
      border="1px solid"
      borderColor={active ? 'primary.main' : 'grey.300'}
      borderRadius={2}
      overflow="hidden"
      sx={{
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: active ? 'primary.dark' : 'grey.400',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        },
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        p={2}
        bgcolor={active ? 'primary.50' : 'grey.50'}
        sx={{
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            bgcolor: active ? 'primary.100' : 'grey.100',
          },
        }}
      >
        <Typography fontWeight={600} color={active ? 'primary.main' : 'text.primary'}>
          Translate Question
        </Typography>
        <Switch checked={active} onChange={(e) => setActive(e.target.checked)} />
      </Box>

      <Collapse in={active}>
        <Box p={3} bgcolor="background.paper" borderTop="1px solid" borderColor="grey.200">
          <Box
            display="flex"
            alignItems="center"
            gap={2}
            mb={3}
            p={2}
            bgcolor="grey.50"
            borderRadius={2}
          >
            <Select size="small" value="en" sx={{ minWidth: 120, bgcolor: 'white' }}>
              <MenuItem value="en">English</MenuItem>
            </Select>

            <Box
              sx={{
                p: 1,
                borderRadius: '50%',
                bgcolor: 'white',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'grey.100' },
              }}
            >
              ⇄
            </Box>

            <Select
              size="small"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              sx={{ minWidth: 120, bgcolor: 'white' }}
            >
              {LANGUAGES.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.name}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box
            mb={3}
            border="1px solid"
            borderColor="grey.300"
            borderRadius={2}
            bgcolor="white"
            minHeight={120}
          >
            <TextField
              placeholder="Tap to enter text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              fullWidth
              multiline
              minRows={4}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  border: 'none',
                  '& fieldset': { border: 'none' },
                },
                '& .MuiInputBase-input': {
                  fontSize: '1rem',
                },
              }}
            />
          </Box>

          <Stack direction="row" justifyContent="flex-end">
            <Button variant="contained" onClick={handleGenerate}>
              Translate
            </Button>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
};
