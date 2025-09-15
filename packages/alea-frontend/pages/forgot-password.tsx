import { Box, Typography } from '@mui/material';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { sendForgotEmail } from '@alea/spec';
import { NextPage } from 'next';
import { useState } from 'react';
import MainLayout from '../layouts/MainLayout';

const ForgotPasswordPage: NextPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [response, setResponse] = useState<string>(
    "Just a moment, we're in the process of verifying the email."
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    try {
      const res = await sendForgotEmail(email);
      setResponse(res.data.message);
    } catch (error) {
      if (error.response) {
        setResponse(error.response.data.message);
      } else {
        setResponse('An error occurred while processing your request.');
      }
    }
  }

  return (
    <MainLayout>
      {submitted ? (
        <Typography textAlign="center" mt="50px" fontSize={16}>
          {response}
        </Typography>
      ) : (
        <Box
          component="form"
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '500px',
            margin: 'auto',
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Password Reset
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Enter the email address that you used to sign up. We will send you
            an email with a link to reset your password.
          </Typography>
          <TextField
            label="Email Address"
            type="email"
            sx={{ width: '100%', mb: 2 }}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button variant="contained" type="submit" sx={{ width: '100%' }}>
            SEND
          </Button>
          <Typography variant="body2" sx={{ mt: 2 }}>
            If you still need help, contact ALᴇA Support.
          </Typography>
        </Box>
      )}
    </MainLayout>
  );
};

export default ForgotPasswordPage;
