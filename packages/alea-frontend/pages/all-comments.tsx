import { Box } from '@mui/material';
import { getLatestUpdatedSections } from '@alea/spec';
import { CommentSection } from '@alea/comments';
import { FTMLFragment } from '@kwarc/ftml-react';
import type { NextPage } from 'next';
import { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';

export interface CommentSection {
  uri: string;
  updatedTimestampSec: number;
}

const AllCommentsPage: NextPage = () => {
  const [sections, setSections] = useState<CommentSection[]>([]);

  useEffect(() => {
    getLatestUpdatedSections().then(setSections);
  }, []);
  return (
    <MainLayout title="All Comments | ALeA">
      <Box p="15px" m="0 auto" maxWidth="800px">
        {sections.map((section) => (
          <Box key={section.uri} border="1px solid #CCC" p="10px" m="10px">
            {/* <FTMLFragment fragment={{ uri: section.uri }} /> */}
            {/* We Will use FTMLFragment here instead of  {section.uri} */}
            {section.uri}
            <CommentSection uri={section.uri} allCommentsMode={true} />
          </Box>
        ))}
      </Box>
    </MainLayout>
  );
};

export default AllCommentsPage;
