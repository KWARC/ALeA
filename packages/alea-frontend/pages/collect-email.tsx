import { Box, Button, TextField, Typography } from '@mui/material';
import { getUserInformation, setIdmEmail } from '@alea/spec';
import { isFakeXxxId, needsIdmEmailCollect } from '@alea/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useIsLoggedIn } from '@alea/react-utils';
import { getLocaleObject } from '../lang/utils';
import MainLayout from '../layouts/MainLayout';

const POLL_MS = 8000;

const CollectEmailPage: NextPage = () => {
  const router = useRouter();
  const { loggedIn, loginCheckPending } = useIsLoggedIn();
  const { collectEmail: t } = getLocaleObject(router);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const [isFake, setIsFake] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!router.isReady || loginCheckPending) return;
    if (!loggedIn) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    async function load(force: boolean) {
      try {
        const info = await getUserInformation(force);
        if (cancelled || !info) return;
        setIsFake(isFakeXxxId(info.userId));
        if (info.email) setEmail((prev) => prev || info.email || '');
        if (!needsIdmEmailCollect(info)) {
          const target = typeof router.query.target === 'string' ? router.query.target : '/';
          router.replace(target.startsWith('/') ? target : '/');
        }
      } catch {
        /* 403: not logged in */
      }
    }
    load(true);
    const id = setInterval(() => load(true), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router.isReady, loggedIn, loginCheckPending, router]);

  const onSubmit = async () => {
    setBusy(true);
    setError('');
    try {
      await setIdmEmail(email);
      setStatus('sent');
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message || t.error;
      setError(message);
      setStatus('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <MainLayout>
      <Box sx={{ maxWidth: 480, mx: 'auto', mt: 6, px: 2 }}>
        <Typography variant="h5" gutterBottom>
          {t.title}
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {isFake ? t.bodyFake : t.bodyIdm}
        </Typography>
        <TextField
          fullWidth
          label={t.emailLabel}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2 }}
        />
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        {status === 'sent' && (
          <Typography sx={{ mb: 2 }}>{t.checkInbox}</Typography>
        )}
        <Button variant="contained" fullWidth disabled={busy || !email.trim()} onClick={onSubmit}>
          {status === 'sent' ? t.resend : t.submit}
        </Button>
      </Box>
    </MainLayout>
  );
};

export default CollectEmailPage;
