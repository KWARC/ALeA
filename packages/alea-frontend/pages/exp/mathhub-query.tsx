import { getQueryResults, SparqlResponse } from '@alea/spec';
import { createSafeFlamsQuery, findAllUriParams } from '@alea/utils';
import AddIcon from '@mui/icons-material/Add';
import InfoIcon from '@mui/icons-material/Info';
import RemoveIcon from '@mui/icons-material/Remove';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useEffect, useMemo, useState } from 'react';
import { ParameterizationInfoDialog } from '../../components/mathhub-query/ParameterizationInfoDialog';
import { QueryTemplateSelector } from '../../components/mathhub-query/QueryTemplateSelector';
import { ResultsDisplay } from '../../components/mathhub-query/ResultsDisplay';
import { UriAutocompleteInput } from '../../components/mathhub-query/UriAutocompleteInput';
import { QUERY_TEMPLATES } from '../../components/mathhub-query/query-templates.config';

const QueryEditorContainer = styled(Paper)(({ theme }) => ({
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

export default function MathhubQuery() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('Concept Dependencies');
  const [results, setResults] = useState<SparqlResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const initialTemplate =
    QUERY_TEMPLATES.find((t) => t.name === 'Concept Dependencies') || QUERY_TEMPLATES[0];
  const [query, setQuery] = useState(initialTemplate.query);
  const [uriValues, setUriValues] = useState<Record<string, string | string[]>>(
    initialTemplate.defaultUriParams
  );

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

  const handleTemplateChange = (templateName: string) => {
    const template = QUERY_TEMPLATES.find((t) => t.name === templateName);
    if (template) {
      setSelectedTemplate(templateName);
      setQuery(template.query);
      setUriValues(template.defaultUriParams);
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
        <QueryTemplateSelector
          selectedTemplate={selectedTemplate}
          onTemplateChange={handleTemplateChange}
        />
        <TextField
          label="Your Query here"
          size="small"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedTemplate('');
          }}
          multiline
          placeholder="Your Query here"
        />
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, mb: 1 }}>
          <IconButton
            size="small"
            sx={{ color: 'info.main' }}
            onClick={() => setInfoDialogOpen(true)}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </Box>
        <ParameterizationInfoDialog
          open={infoDialogOpen}
          onClose={() => setInfoDialogOpen(false)}
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
                        <UriAutocompleteInput
                          size="small"
                          value={uri}
                          onChange={(newValue) => {
                            const newArray = [...uriArray];
                            newArray[index] = newValue;
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
                <UriAutocompleteInput
                  key={paramName}
                  value={typeof value === 'string' ? value : ''}
                  onChange={(newValue) => {
                    setUriValues((prev) => ({
                      ...prev,
                      [paramName]: newValue,
                    }));
                  }}
                  placeholder={`FTML URI for ${paramName}`}
                  size="small"
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
