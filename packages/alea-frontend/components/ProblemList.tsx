import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
  CircularProgress,
  useTheme,
} from '@mui/material';
import { SafeHtml } from '@alea/react-utils';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import { getLocaleObject } from '../lang/utils';
import { FTML } from '@flexiformal/ftml';
import { getCourseProblemCounts } from '@alea/spec';
import { getExamsForCourse } from '@alea/spec';

import { ExamSelect } from '@alea/stex-react-renderer';

interface TitleMetadata {
  uri?: string;
  id?: string;
  chapterTitle: string;
  sectionTitle: string;
}
interface ExamInfo {
  uri: string;
  term?: string;
  number?: string;
  date?: string;
}

const extractTitlesAndSectionUri = (
  toc: FTML.TocElem | null,
  chapterTitle = ''
): TitleMetadata[] => {
  if (!toc || toc.type === 'Paragraph' || toc.type === 'Slide') {
    return [];
  }

  if (toc.type === 'Section' && chapterTitle) {
    return [
      {
        uri: toc.uri,
        id: toc.id,
        chapterTitle,
        sectionTitle: toc.title,
      },
    ];
  }

  if (!chapterTitle && toc.type === 'Section') chapterTitle = toc.title;
  return toc.children.flatMap((child) => extractTitlesAndSectionUri(child, chapterTitle));
};

interface ProblemListProps {
  courseSections: FTML.TocElem[];
  courseId: string;
}

const sortExamsByDateDesc = (exams: ExamInfo[]): ExamInfo[] => {
  return [...exams].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });
};

const ProblemList: FC<ProblemListProps> = ({ courseSections, courseId }) => {
  const [problemCounts, setProblemCounts] = useState<Record<string, number> | null>(null);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { practiceProblems: t, peerGrading: g } = getLocaleObject(router);

  useEffect(() => {
    if (!courseId) return;

    getExamsForCourse(courseId)
      .then((data) => {
        const sorted = sortExamsByDateDesc(data);
        setExams(sorted);
      })
      .catch(console.error);
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    getCourseProblemCounts(courseId)
      .then((data) => setProblemCounts(data))
      .catch((err) => console.error('Error fetching problem counts:', err))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (problemCounts === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const titlesAndSectionUri = courseSections
    .flatMap((toc) => extractTitlesAndSectionUri(toc))
    .filter(
      ({ chapterTitle, sectionTitle }) =>
        chapterTitle.toLowerCase() !== 'preface' && sectionTitle.toLowerCase() !== 'preface'
    );

  const hasAnyProblems = titlesAndSectionUri.some(
    (item) => (problemCounts[item.uri || ''] || 0) > 0
  );

  if (!hasAnyProblems) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          Problem not found for this course.
        </Typography>
      </Box>
    );
  }

  const groupedByChapter: Record<string, TitleMetadata[]> = {};
  titlesAndSectionUri.forEach((item) => {
    const { chapterTitle } = item;
    if (!groupedByChapter[chapterTitle]) {
      groupedByChapter[chapterTitle] = [];
    }
    groupedByChapter[chapterTitle].push(item);
  });

  const seeSectionProblems = (sectionUri?: string, sectionTitle?: string) => {
    router.push({
      pathname: '/per-section-quiz',
      query: {
        sectionUri,
        courseId,
        sectionTitle,
      },
    });
  };

  const goToSection = (sectionId?: string) => {
    window.location.href = `/course-notes/${courseId}#${sectionId}`;
  };
const theme = useTheme();
  return (
    <Box maxWidth={800} px={{ xs: 1, sm: 2 }} m="0 auto">
      <Typography variant="h2" my={3} textAlign="center">
        {t.practiceProblems}
      </Typography>

      <Box sx={{ marginLeft: { sm: 'auto' }, width: { xs: '100%', sm: 'auto' } }}>
        <Link href={`/peer-grading/${courseId}`} passHref>
          <Button
            variant="contained"
            fullWidth={true}
            sx={{ height: '56px', px: 4, fontSize: '16px', fontWeight: 'bold' }}
          >
            {g.peerGrading}
          </Button>
        </Link>
      </Box>

      <Box
        sx={{
          my: 4,
          p: 3,
          bgcolor: '#fafafa',
          borderRadius: '12px',
          border: '1px solid #eee',
          boxShadow: '0px 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        <Typography
          variant="body1"
          sx={{ color: '#555', fontStyle: 'italic', mb: 3, lineHeight: 1.6 }}
        >
          Old exams are great practice resources, but since exam styles evolve, recent exams are
          better models, and any course topic even if not asked before can still appear in upcoming
          exams
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
          }}
        >
          <ExamSelect
            exams={exams}
            courseId={courseId}
            value={selectedExam}
            onChange={(examUri) => {
              setSelectedExam(examUri);
              router.push({
                pathname: '/exam-problems',
                query: { examUri },
              });
            }}
            label="Select Exam"
          />
        </Box>
      </Box>

      <Typography variant="body1" my={3}>
        {t.practiceProblemsDescription}
      </Typography>

      <Paper
        sx={{
          p: { xs: 1, sm: 3 },
          borderRadius: 2,
          boxShadow: 3,
          overflowY: 'auto',
          textAlign: 'left',
          backgroundColor: 'background.paper',
          borderLeft: `3px solid ${'primary.main'}`,
        }}
      >
        {Object.entries(groupedByChapter).map(([chapter, sections]) => (
          <Box key={chapter} mb={3}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h3" sx={{ mb: 1, fontWeight: 'bold',fontSize:20 }}>
                <SafeHtml html={chapter} />
              </Typography>
            </Box>
            <List>
              {sections.map(({ id, uri, sectionTitle }, index) => {
                const problemCount = problemCounts?.[uri || ''] || 0;
                const isEnabled = problemCount > 0;

                return (
                  <ListItem
                    key={`${uri}-${index}-${id}`}
                    disablePadding
                    sx={{
                      mb: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'background.paper',
                      borderRadius: '8px',
                      py: 2,
                      px: 2,
                      transition: 'background-color 0.3s ease, transform 0.2s ease',
                     '&:hover': {
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(90deg, #0f2a33 0%, #2b2140 100%)'
      : 'linear-gradient(90deg, #e0f7fa 0%, #d1c4e9 100%)',
},
                    }}
                  >
                    <ListItemText
                      primary={
                        <>
                          <Typography
                            variant="body1"
                            component="div"
                            sx={{
                              fontWeight: 'medium',
                              fontSize: '1rem',
                              cursor: 'pointer',
                              width: 'fit-content',
                              '&:hover': { transform: 'scale(1.02)', textDecoration: 'underline' },
                            }}
                            onClick={() => goToSection(id)}
                          >
                            <SafeHtml html={sectionTitle} />
                          </Typography>
                          {isEnabled && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {`${problemCount} problems`}
                            </Typography>
                          )}
                        </>
                      }
                    />
                    {isEnabled ? (
                      <Button
                        variant="contained"
                        sx={{
                          minWidth: 127,
                          borderRadius: 5,
                          textTransform: 'none',
                          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                          transition: 'background-color 0.3s ease, transform 0.2s ease',
                          '&:hover': { transform: 'scale(1.05)' },
                        }}
                        onClick={() => seeSectionProblems(uri, sectionTitle)}
                      >
                        {t.practice}
                      </Button>
                    ) : (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          textAlign: 'right',
                          minWidth: 127,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          height: '100%',
                          mr: 2,
                        }}
                      >
                        No problem found
                      </Typography>
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
