import { CircularProgress, Typography } from '@mui/material';
import { resetFakeUserData } from '@alea/spec';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const ResetAndRedirectPage: NextPage = () => {
  const router = useRouter();
  const redirectPath = router.query['redirectPath'] as string;
  const persona = router.query['persona'] as string;

  useEffect(() => {
    if (!router.isReady) return;
    resetFakeUserData(persona).then(() => {
      window.location.replace(redirectPath);
    });
  }, [router, router.isReady, redirectPath, persona]);

  return (
    <>
      <CircularProgress />
      <br/>
      {router.isReady && <Typography>Resetting user profile</Typography>}
    </>
  );
};

export default ResetAndRedirectPage;
