import { SparqlResponse } from '@alea/spec';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMemo, useState } from 'react';

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

interface ResultsDisplayProps {
  isLoading: boolean;
  error: string;
  results: SparqlResponse | null;
  handleCopyJson: () => void;
  copied: boolean;
}

type ViewMode = 'json' | 'table';

export const ResultsDisplay = ({
  isLoading,
  error,
  results,
  handleCopyJson,
  copied,
}: ResultsDisplayProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('json');

  // Extract column names and types from bindings
  const { columns, columnTypes } = useMemo(() => {
    if (!results?.results?.bindings || results.results.bindings.length === 0) {
      return { columns: [], columnTypes: {} };
    }

    const cols = new Set<string>();
    const types: Record<string, string> = {};

    // Collect all column names and their types from all bindings
    results.results.bindings.forEach((binding) => {
      Object.keys(binding).forEach((key) => {
        cols.add(key);
        // Store the type from the first binding that has this column
        if (!types[key] && binding[key]?.type) {
          types[key] = binding[key].type;
        }
      });
    });

    return { columns: Array.from(cols), columnTypes: types };
  }, [results]);

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  return (
    <StyledResultsContainer elevation={0}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight="bold" color="text.primary">
          Results ({results?.results?.bindings?.length ?? 0})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {results && (
            <>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
                aria-label="view mode"
              >
                <ToggleButton value="json" aria-label="json view">
                  JSON view
                </ToggleButton>
                <ToggleButton value="table" aria-label="table view">
                  Table view
                </ToggleButton>
              </ToggleButtonGroup>
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
            </>
          )}
        </Box>
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

      {results && viewMode === 'json' && (
        <StyledResultDisplayBox>
          <pre style={{ margin: 0, color: 'text.primary' }}>{JSON.stringify(results, null, 2)}</pre>
        </StyledResultDisplayBox>
      )}

      {results && viewMode === 'table' && (
        <StyledResultDisplayBox>
          {columns.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
              No data to display
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell key={column} sx={{ fontWeight: 'bold' }}>
                        {column} {columnTypes[column] && `(${columnTypes[column]})`}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.results?.bindings?.map((binding, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {columns.map((column) => (
                        <TableCell key={column}>
                          {binding[column]?.value ?? ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
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

