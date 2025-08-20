import { Box, Button, Collapse, MenuItem, Select, Stack, Switch, Typography } from '@mui/material';
import { generateQuizProblems, QuizProblem } from '@stex-react/api';
import { useState } from 'react';
import { FlatQuizProblem } from '../../pages/quiz-gen';

interface TranslateProps {
  problemData: FlatQuizProblem;
  language?: string;
  onTranslated?: (newVariant: QuizProblem) => void;
  onLoadingChange?: (loading: boolean) => void;
}
//TODO remove code
const LANGUAGES = [
  { code: 'German', name: 'German' },
  { code: 'English', name: 'English' },
  { code: 'Spanish', name: 'Spanish' },
  { code: 'Polish', name: 'Polish' },
  { code: 'French', name: 'French' },
];
export const Translate = ({
  problemData,
  language,
  onTranslated,
  onLoadingChange,
}: TranslateProps) => {
  const [active, setActive] = useState(false);
  const [targetLang, setTargetLang] = useState('English');

  const handleGenerate = async () => {
    if (!problemData?.problemId) return;
    onLoadingChange?.(true);
    try {
      const result = await generateQuizProblems({
        mode: 'variant',
        problemId: problemData.problemId,
        variantType: 'translate',
        language: targetLang,
      });
      if (result.length > 0) {
        onTranslated?.(result[0]);
      }
    } finally {
      onLoadingChange?.(false);
    }
  };
  console.log({ language });

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
            justifyContent="center"
            gap={2}
            flexWrap="wrap"
            p={2}
            bgcolor="grey.50"
            borderRadius={2}
          >
            <Select
              size="small"
              value={language || 'English'}
              sx={{
                minWidth: { xs: 100, sm: 120 },
                flex: 1,
                bgcolor: 'white',
              }}
            >
              {language ? (
                <MenuItem value={language}>
                  {LANGUAGES.find((l) => l.code === language)?.name || language}
                </MenuItem>
              ) : (
                LANGUAGES.map((lang) => (
                  <MenuItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </MenuItem>
                ))
              )}
            </Select>

            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              sx={{ minWidth: 40 }}
            >
              <Box
                sx={{
                  p: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  bgcolor: 'white',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'grey.100' },
                }}
              >
                ⇄
              </Box>
            </Box>

            <Select
              size="small"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              sx={{
                minWidth: { xs: 100, sm: 120 },
                flex: 1,
                bgcolor: 'white',
              }}
            >
              {LANGUAGES.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.name}
                </MenuItem>
              ))}
            </Select>
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
