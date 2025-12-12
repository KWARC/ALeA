import { getQueryResults, SparqlResponse } from '@alea/spec';
import { createSafeFlamsQuery, findAllUriParams } from '@alea/utils';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RemoveIcon from '@mui/icons-material/Remove';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useEffect, useMemo, useState } from 'react';

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

type SparqlBindingValue = {
  type?: string;
  value: string;
  datatype?: string;
};

type SparqlBinding = Record<string, SparqlBindingValue>;

const transformBindings = (bindings: SparqlBinding[]) => {
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
  handleCopyJson: () => void;
  copied: boolean;
}

const ResultsDisplay = ({
  isLoading,
  error,
  results,
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

      {results && (
        <StyledResultDisplayBox>
          <pre style={{ margin: 0, color: 'text.primary' }}>
            {JSON.stringify(results, null, 2)}
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
  const [query, setQuery] = useState(`# Definitional dependencies of a concept
SELECT DISTINCT ?dependency WHERE {
  ?loname rdf:type ulo:definition .
  ?loname ulo:defines <_uri_a> .
  ?loname ulo:crossrefs ?dependency .
}`);
  const [results, setResults] = useState<SparqlResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [uriValues, setUriValues] = useState<Record<string, string | string[]>>({
    _uri_a:
      'http://mathhub.info?a=smglom/computing&p=mod&m=information-processing-system&s=information processing system',
  });

  const { singleParamNames, multiParamNames } = useMemo(() => findAllUriParams(query), [query]);
  const allParamNames = useMemo(
    () => [...singleParamNames, ...multiParamNames],
    [singleParamNames, multiParamNames]
  );

  useEffect(() => {
    setUriValues((prev) => {
      const next: Record<string, string | string[]> = {};
      allParamNames.forEach((paramName) => {
        next[paramName] = prev[paramName] ?? (multiParamNames.includes(paramName) ? [''] : '');
      });

      const prevKeys = Object.keys(prev);
      const hasDiff =
        prevKeys.length !== allParamNames.length ||
        allParamNames.some((paramName) => prev[paramName] === undefined);

      return hasDiff ? next : prev;
    });
  }, [allParamNames, multiParamNames]);

  const finalQuery = useMemo(() => createSafeFlamsQuery(query, uriValues), [query, uriValues]);

  const handleQuery = async () => {
    setIsLoading(true);
    setError('');
    setResults(null);

    try {
      const data = await getQueryResults(finalQuery);
      setResults(data);
    } catch (e) {
      setError('Failed to fetch query results. Please check your query.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(results.results?.bindings ?? [], null, 2));
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
        <TextField
          label="Your Query here"
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          multiline
          placeholder="Your Query here"
        />
        {allParamNames.length > 0 && (
          <Box
            sx={{
              mt: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              border: '1px solid #e0e0e0',
              borderRadius: 1,
              p: 1,
            }}
          >
            <Typography variant="h6" fontWeight="bold" color="text.primary">
              FTML URI Parameters
            </Typography>
            {allParamNames.map((paramName) => {
              const isMulti = multiParamNames.includes(paramName);
              const value = uriValues[paramName];

              if (isMulti) {
                const uriArray = Array.isArray(value) ? value : [];
                return (
                  <Box key={paramName} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" fontSize="1rem" color="text.primary">
                      {paramName}&nbsp;
                      <IconButton
                        size="small"
                        onClick={() => {
                          const newArray = [...uriArray, ''];
                          setUriValues((prev) => ({
                            ...prev,
                            [paramName]: newArray,
                          }));
                        }}
                      >
                        <AddIcon />
                      </IconButton>
                    </Typography>
                    {uriArray.map((uri, index) => (
                      <Box
                        key={index}
                        sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 0.5 }}
                      >
                        <TextField
                          size="small"
                          value={uri}
                          onChange={(e) => {
                            const newArray = [...uriArray];
                            newArray[index] = e.target.value;
                            setUriValues((prev) => ({
                              ...prev,
                              [paramName]: newArray,
                            }));
                          }}
                          placeholder={`FTML URI for ${paramName} list at idx [${index}]`}
                          sx={{ flex: 1 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => {
                            const newArray = uriArray.filter((_, i) => i !== index);
                            setUriValues((prev) => ({
                              ...prev,
                              [paramName]: newArray,
                            }));
                          }}
                          color="error"
                        >
                          <RemoveIcon />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                );
              }

              return (
                <TextField
                  key={paramName}
                  label={paramName}
                  size="small"
                  value={typeof value === 'string' ? value : ''}
                  onChange={(e) => {
                    setUriValues((prev) => ({
                      ...prev,
                      [paramName]: e.target.value,
                    }));
                  }}
                  placeholder={`FTML URI for ${paramName}`}
                />
              );
            })}
          </Box>
        )}
        {allParamNames.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
              Final Query Preview
            </Typography>
            <StyledResultDisplayBox sx={{ mt: 1, height: 180 }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {finalQuery}
              </pre>
            </StyledResultDisplayBox>
          </Box>
        )}
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
        handleCopyJson={handleCopyJson}
        copied={copied}
      />
    </Box>
  );
}
