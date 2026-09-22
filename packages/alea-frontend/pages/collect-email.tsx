import { Box, Button, TextField, Typography } from '@mui/material';
import { getUserInformation, setIdmEmail } from '@alea/spec';
import { isFakeXxxId, isFauDeEmail, needsCampusEmailCollect } from '@alea/utils';
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [needNames, setNeedNames] = useState(false);
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
        setNeedNames(!!info.cdiEmailPending && !info.userId);
        if (info.email) setEmail((prev) => prev || info.email || '');
        if (info.firstName) setFirstName((prev) => prev || info.firstName || '');
        if (info.lastName) setLastName((prev) => prev || info.lastName || '');
        if (!needsCampusEmailCollect(info)) {
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

  const trimmed = email.trim();
  const hasEmailShape = trimmed.includes('@') && trimmed.includes('.');
  const emailIsValid = isFake ? hasEmailShape : isFauDeEmail(trimmed);
  const namesOk = !needNames || (!!firstName.trim() && !!lastName.trim());
  let emailHint: string | undefined;
  if (isFake) {
    if (trimmed && !emailIsValid) emailHint = t.invalidEmail;
  } else if (!emailIsValid) {
    emailHint = t.requireFau;
  }

  const onSubmit = async () => {
    if (!emailIsValid || !namesOk) return;
    setBusy(true);
    setError('');
    try {
      await setIdmEmail(email, needNames ? { firstName: firstName.trim(), lastName: lastName.trim() } : undefined);
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
        {needNames && (
          <>
            <TextField
              fullWidth
              label={t.firstNameLabel}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label={t.lastNameLabel}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              sx={{ mb: 2 }}
            />
          </>
        )}
        <TextField
          fullWidth
          label={t.emailLabel}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={!!trimmed && !emailIsValid}
          helperText={emailHint}
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
        <Button variant="contained" fullWidth disabled={busy || !emailIsValid || !namesOk} onClick={onSubmit}>
          {status === 'sent' ? t.resend : t.submit}
        </Button>
      </Box>
    </MainLayout>
  );
};

export default CollectEmailPage;
