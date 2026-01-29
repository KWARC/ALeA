import { NextPage } from 'next';
import { useRouter } from 'next/router';
import SearchCourseNotes from '../../components/SearchCourseNotes';
import MainLayout from '../../layouts/MainLayout';
import { getAllCourses } from '@alea/spec';
import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';

const SearchPage: NextPage = () => {
  const router = useRouter();
  const { query, courseId } = router.query as { query?: string; courseId?: string };

  const [notesUri, setNotesUri] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!courseId) return;

    const loadNotesUri = async () => {
      setLoading(true);
      try {
        const courses = await getAllCourses();
        setNotesUri(courses?.[courseId]?.notes);
      } catch (err) {
        console.error('Failed to load course notes', err);
        setNotesUri(undefined);
      } finally {
        setLoading(false);
      }
    };

    loadNotesUri();
  }, [courseId]);
  return (
    <MainLayout title="Search">
      {courseId && loading && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 40,
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}

      {courseId && !loading && notesUri && (
        <SearchCourseNotes courseId={courseId} notesUri={notesUri} query={query} />
      )}

      {courseId && !loading && !notesUri && (
        <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>Loading course notes…</Box>
      )}
    </MainLayout>
  );
};

export default SearchPage;
