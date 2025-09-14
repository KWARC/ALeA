import { Box, Typography } from '@mui/material';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { resetPassword } from '@alea/spec';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { passwordRegex } from './signup';
import { getLocaleObject } from '../lang/utils';

const ResetPasswordPage: NextPage = () => {
  const router = useRouter();
  const { logInSystem: t, learnerModelPriming: x } = getLocaleObject(router);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { query } = router;
  const handleSubmit = async () => {
    if (password !== confirmPassword) {
      alert(t.passwordConfirm);
      return;
    }
    if (!passwordRegex.test(password)) {
      setError(t.passwordRegex);
      return;
    }
    try {
      await resetPassword(query.email as string, password, query.id as string);
      alert(t.reset200);
      router.push('/login');
    } catch (error) {
      alert(
        error.response.status == 400
          ? t.reset400
          : error.response.status === 409
          ? t.reset409
          : error.response.status === 410
          ? t.reset410
          : t.reset404
      );
      router.push('/login');
    }
  };
  return (
    <MainLayout>
      <Box
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '300px',
          margin: 'auto',
        }}
      >
        <TextField
          fullWidth
          label="Password"
          type="password"
          variant="outlined"
          margin="normal"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <TextField
          fullWidth
          label="Confirm Password"
          type="password"
          variant="outlined"
          margin="normal"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button variant="contained" color="primary" onClick={handleSubmit}>
          {x.submit}
        </Button>
        {error && (
          <Box mt={2} width="300px">
            <Typography color="error">{error}</Typography>
          </Box>
        )}
      </Box>
    </MainLayout>
  );
};

export default ResetPasswordPage;
