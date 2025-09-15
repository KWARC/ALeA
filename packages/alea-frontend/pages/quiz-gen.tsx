import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import {
  getUserInfo,
  ProblemJson,
  QuizProblem,
  runGraphDbSelectQuery,
  runGraphDbUpdateQuery,
  UserInfo,
} from '@alea/spec';
import { PRIMARY_COL } from '@alea/utils';
import { useRouter } from 'next/router';
import { CourseSectionSelector } from '../components/quiz-gen/CourseSectionSelector';
import { QuizPanel } from '../components/quiz-gen/QuizPanel';
import { QuestionSidebar } from '../components/quiz-gen/QuizSidebar';
import { QuizViewMode, ViewModeSelector } from '../components/quiz-gen/ViewModeSelector';
import { SecInfo } from '../types';

export function getSectionNameFromIdOrUri(
  idOrUri: string | undefined,
  sections: SecInfo[]
): string {
  if (!idOrUri || !sections) return 'Unknown Section';
  const section = sections.find((s) => s.id === idOrUri || s.uri === idOrUri) || undefined;
  return section?.title?.replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, '') || 'Unknown Section';
}

export type FlatQuizProblem = Omit<QuizProblem, 'problemJson'> & ProblemJson;
export interface ExistingProblem {
  uri: string;
  sectionUri: string;
  sectionId: string;
}

export function isGenerated(p: FlatQuizProblem | ExistingProblem): p is FlatQuizProblem {
  return 'problemId' in p;
}

export function isExisting(p: FlatQuizProblem | ExistingProblem): p is ExistingProblem {
  return 'uri' in p && !('problemId' in p);
}

export function SparqlTester() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunQuery = async (type: 'select' | 'update') => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let data;
      if (type === 'select') {
        data = await runGraphDbSelectQuery(query);
      } else {
        data = await runGraphDbUpdateQuery(query);
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        SPARQL Query Tester
      </Typography>

      <TextField
        label="SPARQL Query"
        multiline
        rows={6}
        fullWidth
        variant="outlined"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="contained"
          onClick={() => handleRunQuery('select')}
          disabled={loading || !query.trim()}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Run Query'}
        </Button>

        <Button
          variant="outlined"
          color="secondary"
          onClick={() => handleRunQuery('update')}
          disabled={loading || !query.trim()}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Run Update'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Paper sx={{ p: 2, mt: 2, maxHeight: 400, overflow: 'auto' }}>
          <Typography variant="subtitle1" gutterBottom>
            Result:
          </Typography>
          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </Paper>
      )}
    </Box>
  );
}

const QuizGen = () => {
  const [generatedProblems, setGeneratedProblems] = useState<FlatQuizProblem[]>([]);
  const [existingProblems, setExistingProblems] = useState<ExistingProblem[]>([]);
  const [latestGeneratedProblems, setLatestGeneratedProblems] = useState<FlatQuizProblem[]>([]);
  const [generatedIdx, setGeneratedIdx] = useState(0);
  const [existingIdx, setExistingIdx] = useState(0);
  const [allIdx, setAllIdx] = useState(0);
  const [viewMode, setViewMode] = useState<QuizViewMode>('all');
  const [sections, setSections] = useState<SecInfo[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const courseId = router.query.courseId as string;
  useEffect(() => {
    getUserInfo().then((info) => {
      if (!info) {
        router.push('/login');
        return;
      }
      setUserInfo(info);
    });
  }, [router]);

  const currentIdx =
    viewMode === 'generated' ? generatedIdx : viewMode === 'existing' ? existingIdx : allIdx;

  const setCurrentIdx =
    viewMode === 'generated'
      ? setGeneratedIdx
      : viewMode === 'existing'
      ? setExistingIdx
      : setAllIdx;

  const problems = useMemo(() => {
    if (viewMode === 'generated') return generatedProblems;
    if (viewMode === 'existing') return existingProblems;
    return [...generatedProblems, ...existingProblems];
  }, [viewMode, generatedProblems, existingProblems]);
  return (
    <Box display="flex" height="100vh" bgcolor="#f4f6f8">
      <Box flex={1} px={4} py={3} overflow="auto">
        <Typography variant="h3" fontWeight="bold" textAlign="center" color={PRIMARY_COL} mb={3}>
          Quiz Builder
        </Typography>
        <CourseSectionSelector
          courseId={courseId}
          loading={loading}
          setLoading={setLoading}
          sections={sections}
          setSections={setSections}
          setExistingProblemUris={setExistingProblems}
          setGeneratedProblems={setGeneratedProblems}
          setLatestGeneratedProblems={setLatestGeneratedProblems}
        />
        {/* <SparqlTester/> */}
        <ViewModeSelector viewMode={viewMode} setViewMode={setViewMode} loading={loading} />

        <QuizPanel
          problems={problems}
          currentIdx={currentIdx}
          setCurrentIdx={setCurrentIdx}
          sections={sections}
          courseId={courseId}
          userInfo={userInfo}
        />
      </Box>
      <QuestionSidebar
        generatedProblems={generatedProblems}
        latestGeneratedProblems={latestGeneratedProblems}
        currentIdx={currentIdx}
        setCurrentIdx={setCurrentIdx}
        sections={sections}
        viewMode={viewMode}
        existingProblems={existingProblems}
      />
    </Box>
  );
};

export default QuizGen;
