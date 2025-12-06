import { Box, Link } from '@mui/material';
import { PathToTour } from '@alea/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { UserModelVisualization } from '../components/UserModelVisualization';
import { getLocaleObject } from '../lang/utils';
import MainLayout from '../layouts/MainLayout';

/*
 */
const VisPage: NextPage = () => {
  const router = useRouter();
  const { vis: t } = getLocaleObject(router);
  const [tourId, setTourId] = useState(
    'http://mathhub.info/smglom/topology?inherited-topology' // TODO ALEA4-M2
  );
  return (
    <MainLayout>
      <Box display="flex" m="5px" alignItems="center">
        <Box flexGrow={1} mr="10px">
        </Box>
        <Link href={PathToTour(tourId)}>{t.goToTour}</Link>
      </Box>
      <UserModelVisualization tourId={tourId} />
    </MainLayout>
  );
};
export default VisPage;
