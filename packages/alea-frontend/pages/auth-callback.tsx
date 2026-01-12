import { IS_SERVER } from '@alea/utils';
import { CircularProgress, Typography } from '@mui/material';
import axios from 'axios';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const AuthCallbackPage: NextPage = () => {
  const router = useRouter();
  const otpToken = router.query.otp as string;
  const targetUrl = router.query.target as string;
  const [status, setStatus] = useState<string>('Exchanging authentication token...');

  useEffect(() => {
    if (IS_SERVER || !router.isReady) return;

    const isCorrectDomain = window.location.hostname === process.env.NEXT_PUBLIC_NON_FAU_DOMAIN;
    if (!isCorrectDomain) {
      setStatus('Wrong domain. Redirecting to home...');
      router.replace('/');
      return;
    }

    const handleCallback = async () => {
      if (!otpToken) {
        setStatus('No authentication token provided');
        return router.replace('/');
      }

      try {
        setStatus('Verifying authentication token...');

        // Exchange OTP for JWT cookie
        const response = await axios.post(
          '/api/cross-domain-auth/exchange-otp',
          { otpToken },
          {
            withCredentials: true, // Important: receive cookies
          }
        );

        if (response.status === 200) {
          setStatus('Authentication successful! Redirecting...');
          // Small delay to ensure cookies are set before redirect
          setTimeout(() => {
            window.location.replace(targetUrl || '/');
          }, 100);
        } else {
          setStatus('Authentication failed. Please try logging in again.');
          return router.replace('/');
        }
      } catch (err: unknown) {
        console.error('Error exchanging OTP:', err);
        const errorMessage =
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : 'Failed to complete authentication. Please try logging in again.';
        setStatus(errorMessage);
      }
    };

    handleCallback();
  }, [router.isReady, otpToken, targetUrl, router]);

  return (
    <>
      <CircularProgress />
      <br />
      <Typography>{status}</Typography>
    </>
  );
};

export default AuthCallbackPage;
