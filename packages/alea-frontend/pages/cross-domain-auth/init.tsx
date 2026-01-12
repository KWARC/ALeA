import { loginUsingRedirect } from '@alea/spec';
import { IS_SERVER } from '@alea/utils';
import { CircularProgress, Typography } from '@mui/material';
import axios from 'axios';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const CrossDomainAuthInitPage: NextPage = () => {
  const router = useRouter();
  const targetUrl = router.query.target as string;
  const [status, setStatus] = useState('Preparing cross-domain authentication...');
  useEffect(() => {
    if (IS_SERVER || !router.isReady) return;

    const isCorrectDomain = window.location.hostname === process.env.NEXT_PUBLIC_FAU_DOMAIN;

    if (!isCorrectDomain) {
      router.replace('/');
      return;
    }

    const handleAuth = async () => {
      try {
        const isLoggedInResponse = await axios.get('/api/is-logged-in');
        if (!isLoggedInResponse.data?.isLoggedIn) throw new Error('User is not logged in');
      } catch (err) {
        setStatus('Redirecting to IdM for login');
        const returnUrl = `${
          window.location.origin
        }/cross-domain-auth/init?target=${encodeURIComponent(targetUrl || '/')}`;
        loginUsingRedirect(returnUrl);
      }

      try {
        // Generate OTP token
        const response = await axios.post(
          '/api/cross-domain-auth/generate-otp',
          {},
          { headers: {}, withCredentials: true }
        );

        const { otpToken } = response.data;

        if (!otpToken) {
          alert('Failed to generate OTP token');
          //return router.replace('/');
          return;
        }

        const target = encodeURIComponent(targetUrl || '/');
        const callbackUrl = `https://${process.env.NEXT_PUBLIC_NON_FAU_DOMAIN}/auth-callback?otp=${otpToken}&target=${target}`;

        window.location.replace(callbackUrl);
      } catch (err) {
        console.error('Error generating OTP:', err);
        setStatus('Failed to generate authentication token. Please try again.');
      }
    };

    handleAuth();
  }, [router.isReady, targetUrl, router]);

  return (
    <>
      <CircularProgress />
      <br />
      <Typography>{status}</Typography>
    </>
  );
};

export default CrossDomainAuthInitPage;
