import { Box, Button, List, ListItem, ListItemText, Paper, Typography } from '@mui/material';
import { TOCElem } from '@stex-react/api';
import { PRIMARY_COL } from '@stex-react/utils';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import { getLocaleObject } from '../lang/utils';

interface TitleMetadata {
  uri?: string;
  chapterTitle: string;
  sectionTitle: string;
}

const extractTitlesAndSectionUri = (toc: TOCElem | null, chapterTitle = ''): TitleMetadata[] => {
  if (!toc || toc.type === 'Paragraph' || toc.type === 'Slide') {
    return [];
  }

  if (toc.type === 'Section' && chapterTitle) {
    return [
      {
        uri: toc.uri,
        chapterTitle,
        sectionTitle: toc.title,
      },
    ];
  }

  if (!chapterTitle && toc.type === 'Section') chapterTitle = toc.title;

  return toc.children.flatMap((child) => extractTitlesAndSectionUri(child, chapterTitle));
};

interface ProblemListProps {
  courseSections: TOCElem[];
  courseId: string;
}

const ProblemList: FC<ProblemListProps> = ({ courseSections, courseId }) => {
  const [problemCounts, setProblemCounts] = useState<Record<string, number>>({});
  const router = useRouter();
  const { practiceProblems: t, peerGrading: g } = getLocaleObject(router);

  useEffect(() => {
    if (!courseId) return;
    axios
      .get(`/api/get-course-problem-counts/${courseId}`)
      .then((resp) => setProblemCounts(resp.data))
      .catch((err) => console.error('Error fetching problem counts:', err));
  }, [courseId]);

  const titlesAndSectionUri = courseSections
    .flatMap((toc) => extractTitlesAndSectionUri(toc))
    .filter(
      ({ chapterTitle, sectionTitle }) =>
        chapterTitle.toLowerCase() !== 'preface' && sectionTitle.toLowerCase() !== 'preface'
    );

  const groupedByChapter: Record<string, TitleMetadata[]> = {};
  titlesAndSectionUri.forEach((item) => {
    const { chapterTitle } = item;
    if (!groupedByChapter[chapterTitle]) {
      groupedByChapter[chapterTitle] = [];
    }
    groupedByChapter[chapterTitle].push(item);
  });

  const handleButtonClick = (sectionUri?: string) => {
    console.log('uri : ', sectionUri);
  };

  return (
    <Box maxWidth="800px" px={{ xs: 1, sm: 2 }} m="0 auto">
      <Typography variant="h4" my={3} textAlign="center">
        {t.practiceProblems}
      </Typography>
      <Typography variant="body1" my={3}>
        {t.practiceProblemsDescription}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
        <Box sx={{ marginLeft: 'auto' }}>
          <Link href={`/peer-grading/${courseId}`} passHref>
            <Button variant="contained" sx={{ height: '48px', fontSize: '16px' }}>
              {g.peerGrading}
            </Button>
          </Link>
        </Box>
      </Box>

      <Paper
        sx={{
          p: { xs: 1, sm: 3 },
          borderRadius: 2,
          boxShadow: 3,
          overflowY: 'auto',
          textAlign: 'left',
          backgroundColor: '#ffffff',
          borderLeft: `3px solid ${PRIMARY_COL}`,
        }}
      >
        {Object.entries(groupedByChapter).map(([chapter, sections]) => (
          <Box key={chapter} mb={3}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                {chapter}
              </Typography>
            </Box>
            <List>
              {sections.map(({ uri, sectionTitle }) => {
                const problemCount = problemCounts[uri || ''] || 0;
                const isEnabled = problemCount > 0;

                return (
                  <ListItem
                    key={uri}
                    disablePadding
                    sx={{
                      mb: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#f0f4f8',
                      borderRadius: '8px',
                      py: problemCount > 0 ? 2 : 0,
                      px: 2,
                      cursor: isEnabled ? 'pointer' : undefined,
                      transition: 'background-color 0.3s ease, transform 0.2s ease',
                      '&:hover': isEnabled && {
                        background: 'linear-gradient(90deg, #e0f7fa 0%, #d1c4e9 100%)',
                        transform: 'scale(1.02)',
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <>
                          <Typography
                            variant="body1"
                            sx={{ fontWeight: 'medium', fontSize: '1rem' }}
                          >
                            {sectionTitle}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {problemCount ? `${problemCount} problems` : null}
                          </Typography>
                        </>
                      }
                    />
                    {isEnabled && (
                      <Button
                        variant="contained"
                        sx={{
                          minWidth: '127px',
                          borderRadius: '20px',
                          textTransform: 'none',
                          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                          transition: 'background-color 0.3s ease, transform 0.2s ease',
                          '&:hover': { transform: 'scale(1.05)' },
                        }}
                        onClick={() => handleButtonClick(uri)}
                      >
                        {t.practice}
                      </Button>
                    )}
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Paper>
    </Box>
  );
};

export default ProblemList;
