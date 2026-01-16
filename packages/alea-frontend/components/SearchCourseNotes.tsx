import { SafeFTMLDocument, SafeFTMLFragment } from '@alea/stex-react-renderer';
import SearchIcon from '@mui/icons-material/Search';
import { Box, IconButton, InputAdornment, LinearProgress, TextField, Tooltip } from '@mui/material';
import { useRouter } from 'next/router';

import { useEffect, useState } from 'react';
import { searchDocs, type SearchResult } from '@flexiformal/ftml-backend';

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

  useEffect(() => {
    if (query) {
      setSearchQuery(query);
    }
  }, [query]);

  useEffect(() => {
    if (!searchQuery.trim() || !notesUri) return;
    handleSearch();
  }, [searchQuery, notesUri]);

  async function handleSearch() {
    if (!searchQuery.trim() || !notesUri) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const res: [number, SearchResult][] = await searchDocs(searchQuery, [notesUri], 15);
      console.log({ res });

      const normalized = (res ?? []).map(([, r]) => r);
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

  if (isLoading) {
    return <LinearProgress />;
  }

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
            onClick={async () => {
              const { getAllCourses } = await import('@alea/spec');
              const courses = await getAllCourses();
              const course = courses[courseId];
              const institutionId = course?.universityId || 'FAU';
              router.push(`/${institutionId}/${courseId}/latest`);
            }}
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

      {hasSearched && results.length === 0 && (
        <Box textAlign="center" mt={4} color="text.secondary">
          No results found
        </Box>
      )}

      {results.length > 0 && (
        <Box bgcolor="white" borderRadius="5px" mb="15px" p="10px">
          <Box maxWidth="800px" m="0 auto" p="10px">
            {results.map((res, idx) => {
              if (!res || typeof res !== 'object') return null;

              if ('Document' in res) {
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

              if ('Paragraph' in res) {
                return (
                  <Box key={idx} mb={2}>
                    <SafeFTMLFragment fragment={{ type: 'FromBackend', uri: res.Paragraph.uri }} />
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
