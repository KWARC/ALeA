import { Typography } from '@mui/material';
import { verifyEmail } from '@stex-react/spec';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { getLocaleObject } from '../lang/utils';

const VerifyEmail: NextPage = () => {
  const [data, setData] = useState('');
  const router = useRouter();
  const { logInSystem: t } = getLocaleObject(router);

  useEffect(() => {
    if (!router.isReady) return;
    async function fetchData() {
      try {
        const { query } = router;
        await verifyEmail(query.email as string, query.id as string);
        setData(t.verify200);
      } catch (error) {
        setData(t.verify400);
      }
    }
    fetchData();
  }, [router.isReady, router]);

  return (
    <MainLayout>
      <Typography fontSize={20} mt={10} textAlign="center">
        {data}
      </Typography>
    </MainLayout>
  );
};

export default VerifyEmail;
