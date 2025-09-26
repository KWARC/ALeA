import { FTMLDocument } from '@flexiformal/ftml-react';
import { Box } from '@mui/material';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import MainLayout from '../../layouts/MainLayout';

const BrowserPage: NextPage = () => {
  const router = useRouter();
  const uri = router.query.uri as string;

  return (
    <MainLayout title="sTeX Browser">
      {uri ? (
        <FTMLDocument document={{ type: 'FromBackend', uri }} toc={'Get'} />
      ) : (
        <Box>No URI provided</Box>
      )}
    </MainLayout>
  );
};

export default BrowserPage;
