import { useState, useMemo } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getQueryResults, SparqlResponse } from '@alea/spec';

const QueryEditorContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
}));

const StyledResultsContainer = styled(Paper)(({ theme }) => ({
  marginTop: theme.spacing(3),
  padding: theme.spacing(2),
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
}));

const StyledResultDisplayBox = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  overflow: 'auto',
  flexGrow: 1,
  backgroundColor: theme.palette.grey[100],
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
}));

const transformBindings = (bindings: any[]) => {
  return bindings.map((binding) => {
    const transformed: Record<string, string> = {};

    for (const key in binding) {
      if (Object.prototype.hasOwnProperty.call(binding, key)) {
        transformed[key] = binding[key].value;
      }
    }
    return transformed;
  });
};

interface ResultsDisplayProps {
  isLoading: boolean;
  error: string;
  results: SparqlResponse | null;
  transformedResults: Record<string, string>[] | null;
  handleCopyJson: () => void;
  copied: boolean;
}

const ResultsDisplay = ({
  isLoading,
  error,
  results,
  transformedResults,
  handleCopyJson,
  copied,
}: ResultsDisplayProps) => {
  return (
    <StyledResultsContainer elevation={0}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight="bold" color="text.primary">
          Results
        </Typography>
        {results && (
          <Tooltip title={copied ? 'Copied!' : 'Copy JSON'}>
            <IconButton
              onClick={handleCopyJson}
              sx={{
                color: copied ? 'success.main' : 'text.primary',
                transition: 'color 0.3s ease',
              }}
            >
              {copied ? <CheckCircleIcon /> : <ContentCopyIcon />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Typography color="error" sx={{ textAlign: 'center', mt: 2 }}>
          {error}
        </Typography>
      )}

      {transformedResults && (
        <StyledResultDisplayBox>
          <pre style={{ margin: 0, color: 'text.primary' }}>
            {JSON.stringify(transformedResults, null, 2)}
          </pre>
        </StyledResultDisplayBox>
      )}

      {!isLoading && !error && !results && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
          Query results will appear here.
        </Typography>
      )}
    </StyledResultsContainer>
  );
};

export default function MathhubQuery() {
  const [query, setQuery] = useState('SELECT ?x WHERE { ?x a :Type }');
  const [results, setResults] = useState<SparqlResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const transformedResults = useMemo(() => {
    if (!results) return null;
    return transformBindings(results.results?.bindings ?? []);
  }, [results]);

  const handleQuery = async () => {
    setIsLoading(true);
    setError('');
    setResults(null);

    try {
      const data = await getQueryResults(query);
      setResults(data);
    } catch (e) {
      setError('Failed to fetch query results. Please check your query.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyJson = async () => {
    if (!transformedResults) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(transformedResults, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'grey.50',
        p: 3,
      }}
    >
      <Typography variant="h4" gutterBottom fontWeight="bold" color="text.primary">
        MathHub Query Interface
      </Typography>

      <QueryEditorContainer elevation={0}>
        <Box
          component="textarea"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{
            flexGrow: 1,
            border: 'none',
            resize: 'none',
            p: 1.5,
            fontFamily: 'monospace',
            fontSize: 14,
            outline: 'none',
            bgcolor: 'grey.100',
            borderRadius: 1,
            color: 'text.primary',
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="contained"
            onClick={handleQuery}
            disabled={isLoading}
            sx={{ minWidth: 15 }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Run Query'}
          </Button>
        </Box>
      </QueryEditorContainer>

      <ResultsDisplay
        isLoading={isLoading}
        error={error}
        results={results}
        transformedResults={transformedResults}
        handleCopyJson={handleCopyJson}
        copied={copied}
      />
    </Box>
  );
}
