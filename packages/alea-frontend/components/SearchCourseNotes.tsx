import { FTMLDocument } from '@kwarc/ftml-react';
import SearchIcon from '@mui/icons-material/Search';
import { Box, IconButton, InputAdornment, LinearProgress, TextField, Tooltip } from '@mui/material';
import { GptSearchResult, searchCourseNotes } from '@stex-react/api';
import { useRouter } from 'next/router';

import { useEffect, useState } from 'react';

const SearchCourseNotes = ({
  courseId,
  query,
  onClose,
}: {
  courseId: string;
  query?: string;
  onClose?: any;
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>(query);
  const [references, setReferences] = useState<GptSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  useEffect(() => {
    handleSearch();
  }, []);

  async function handleSearch() {
    if (!searchQuery || !courseId) return;
    setIsLoading(true);
    try {
      const response = await searchCourseNotes(searchQuery, courseId);
      setReferences(response?.sources || []);
    } catch (error) {
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
              {references.map((reference) => (
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
                      toc: undefined,
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
