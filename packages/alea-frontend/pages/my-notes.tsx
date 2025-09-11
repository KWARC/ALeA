import { Box, CircularProgress, Typography } from '@mui/material';
import { getMyNotesSections } from '@stex-react/spec';
import { NotesView } from '@stex-react/comments';
import { PRIMARY_COL } from '@stex-react/utils';
import type { NextPage } from 'next';
import { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { FTMLFragment } from '@kwarc/ftml-react';

export interface NotesSection {
  uri: string;
  courseId: string;
  courseTerm: string;
  updatedTimestampSec: number;
}

interface GroupedNotes {
  [courseId: string]: {
    [instanceId: string]: NotesSection[];
  };
}

const MyNotesPage: NextPage = () => {
  const [sections, setSections] = useState<NotesSection[]>([]);
  const [groupedNotes, setGroupedNotes] = useState<GroupedNotes>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyNotesSections()
      .then(setSections)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const grouped: GroupedNotes = {};

    sections.forEach((section) => {
      const courseId = section.courseId || 'default';
      const instanceId = section.courseTerm || 'default';

      if (!grouped[courseId]) {
        grouped[courseId] = {};
      }
      if (!grouped[courseId][instanceId]) {
        grouped[courseId][instanceId] = [];
      }
      grouped[courseId][instanceId].push(section);
    });
    setGroupedNotes(grouped);
  }, [sections]);

  if (loading) return <CircularProgress />;

  return (
    <MainLayout title="My Notes | ALeA">
      <Box p="10px" m="0 auto" maxWidth="800px">
        {Object.entries(groupedNotes).map(([courseId, instances]) => (
          <Box key={courseId} mb={4}>
            {Object.entries(instances).map(([instanceId, sections]) => (
              <Box key={instanceId} mb={3}>
                <Typography variant="h5" sx={{ mb: 2, color: PRIMARY_COL }}>
                  {courseId.toUpperCase()} ({instanceId})
                </Typography>
                {sections.map((section) => (
                  <Box
                    key={`${section.uri}-${instanceId}`}
                    border="1px solid #CCC"
                    p="10px"
                    m="10px"
                  >
                    {/* TODO ALeA4-N8: FTMLFragment won't render slides using URI - it uses HTML. This case will be handled later */}
                    <FTMLFragment fragment={{ type: 'FromBackend', uri: section.uri }} />
                    <NotesView uri={section.uri} allNotesMode={true} />
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </MainLayout>
  );
};

export default MyNotesPage;
