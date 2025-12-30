import { SafeFTMLDocument } from '@alea/stex-react-renderer';
import SearchIcon from '@mui/icons-material/Search';
import { Box, IconButton, InputAdornment, LinearProgress, TextField, Tooltip } from '@mui/material';
import { useRouter } from 'next/router';

import { useEffect, useRef, useState } from 'react';

type SearchResult = any;

const SearchCourseNotes = ({
  courseId,
  notesUri,
  query,
  onClose,
  setHasResults,
}: {
  courseId: string;
  notesUri: string;
  query?: string;
  onClose?: any;
  setHasResults?: (val: boolean) => void;
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>(query || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState(false);

  const autoSearchedRef = useRef(false);

  useEffect(() => {
    if (query) {
      setSearchQuery(query);
    }
  }, [query]);

  useEffect(() => {
    if (!searchQuery?.trim()) return;
    if (!notesUri) return;
    if (autoSearchedRef.current) return;

    autoSearchedRef.current = true;
    handleSearch();
  }, [searchQuery, notesUri]);

  async function handleSearch() {
    if (!searchQuery.trim() || !notesUri) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(
        `/api/search-docs?query=${encodeURIComponent(searchQuery)}&notesUri=${encodeURIComponent(
          notesUri
        )}`
      );

      const data = await res.json();

      const normalized = Array.isArray(data) ? data.map(([, r]: any) => r).filter(Boolean) : [];

      setResults(normalized);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '10px',
          maxWidth: '800px',
          margin: '0 auto',
          gap: '10px',
        }}
      >
        <Tooltip title={courseId}>
          <img
            height="60px"
            // src={`\\${courseId}.jpg`}
            src={`/${courseId}.jpg`}
            alt={courseId}
            style={{ borderRadius: '5px', cursor: 'pointer' }}
            onClick={() => router.push(`/course-home/${courseId}`)}
          />
        </Tooltip>
        <TextField
          fullWidth
          variant="outlined"
          value={searchQuery}
          placeholder={`Search in ${courseId.toUpperCase() || 'the'} notes`}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={handleSearch}>
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          onKeyDown={handleKeyDown}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Box>

      {isLoading && <LinearProgress />}

      {!isLoading && hasSearched && results.length === 0 && (
        <Box textAlign="center" mt={4} color="text.secondary">
          No results found
        </Box>
      )}

      {!isLoading && results.length > 0 && (
        <Box bgcolor="white" borderRadius="5px" mb="15px" p="10px">
          <Box maxWidth="800px" m="0 auto" p="10px">
            {results.map((res, idx) => {
              if (!res || typeof res !== 'object') return null;

              if ((res as any).Document) {
                return (
                  <Box key={idx} mb={2}>
                    <SafeFTMLDocument
                      document={{ type: 'FromBackend', uri: res.Document }}
                      showContent={true}
                      pdfLink={false}
                      chooseHighlightStyle={false}
                      toc="None"
                    />
                  </Box>
                );
              }

              return null;
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SearchCourseNotes;
