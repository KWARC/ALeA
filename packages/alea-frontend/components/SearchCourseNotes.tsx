import { FTMLDocument } from '@flexiformal/ftml-react';
import SearchIcon from '@mui/icons-material/Search';
import { Box, IconButton, InputAdornment, LinearProgress, TextField, Tooltip } from '@mui/material';
import { GptSearchResult, searchCourseNotes } from '@alea/spec';
import { useRouter } from 'next/router';

import { useEffect, useState } from 'react';

const SearchCourseNotes = ({
  courseId,
  query,
  onClose,
  setHasResults,
}: {
  courseId: string;
  query?: string;
  onClose?: any;
  setHasResults?: (val: boolean) => void;
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>(query);
  const [references, setReferences] = useState<GptSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  useEffect(() => {
    handleSearch();
  }, []);

  async function handleSearch() {
    if (!searchQuery || !courseId) {
      setHasResults(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await searchCourseNotes(searchQuery, courseId);
      setReferences(response?.sources || []);
      setHasResults((response?.sources?.length || 0) > 0);
    } catch (error) {
      setReferences([]);
      setHasResults(false);
      console.error('Error fetching search results:', error);
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
            src={`\\${courseId}.jpg`}
            alt={courseId}
            style={{ borderRadius: '5px', cursor: 'pointer' }}
            onClick={() => router.push(`/course-home/${courseId}`)}
          />
        </Tooltip>
        <TextField
          fullWidth
          variant="outlined"
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

      {isLoading ? (
        <LinearProgress />
      ) : (
        references.length > 0 && (
          <Box bgcolor="white" borderRadius="5px" mb="15px" p="10px">
            <Box maxWidth="800px" m="0 auto" p="10px">
              {references
                .filter((reference) => reference.uri)
                .map((reference) => (
                  <Box
                    key={reference.uri}
                    sx={{
                      border: '1px',
                      borderRadius: 1,
                      mb: 2,
                      p: 1,
                    }}
                  >
                    <FTMLDocument
                      document={{
                        type: 'FromBackend',
                        uri: reference.uri,
                      }}
                    />
                  </Box>
                ))}
            </Box>
          </Box>
        )
      )}
    </Box>
  );
};

export default SearchCourseNotes;
