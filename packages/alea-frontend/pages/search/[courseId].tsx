import { NextPage } from 'next';
import { useRouter } from 'next/router';
import SearchCourseNotes from '../../components/SearchCourseNotes';
import MainLayout from '../../layouts/MainLayout';
import { getAllCourses } from '@alea/spec';
import { useEffect, useState } from 'react';
import { Box } from '@mui/material';

const SearchPage: NextPage = () => {
  const router = useRouter();
  const { query, courseId } = router.query as { query?: string; courseId?: string };

  const [notesUri, setNotesUri] = useState<string | undefined>();
  useEffect(() => {
    if (!courseId) return;

    getAllCourses().then((courses) => {
      setNotesUri(courses?.[courseId]?.notes);
    });
  }, [courseId]);
  return (
    <MainLayout title="Search">
      {courseId ? (
        notesUri ? (
          <SearchCourseNotes courseId={courseId} notesUri={notesUri} query={query} />
        ) : (
          <Box sx={{ p: 3 }}>Loading course notes…</Box>
        )
      ) : null}
    </MainLayout>
  );
};

export default SearchPage;
