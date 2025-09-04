import {
  Box,
  Button,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import {
  anonUserSignUp,
  checkIfUserIdExists,
  logInUser,
  ANON_USER_ID_PREFIX,
} from '@stex-react/spec';
import { BG_COLOR, capitalizeFirstLetter, PRIMARY_COL, setCookie } from '@stex-react/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { ADJECTIVES, ANIMALS } from '../constants/avatar';
import MainLayout from '../layouts/MainLayout';

function modifyUserId(personality: string, animalName: string): string {
  return `${ANON_USER_ID_PREFIX}${personality}_${animalName}`;
}

const AnonLoginPage: NextPage = () => {
  const [userId, setUserId] = useState('');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    personality: '',
    animalName: '',
  });
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [focused, setFocused] = useState(false);
  const [isAvatarExist, setIsAvatarExist] = useState(false);
  const [isCheckingAvatar, setIsCheckingAvatar] = useState(false);
  const router = useRouter();
  const returnBackUrl = router.query.target as string;

  useEffect(() => {
    const checkAvatar = async () => {
      if (!isLoginMode && formData.personality && formData.animalName) {
        setIsCheckingAvatar(true);
        const updatedUserId = modifyUserId(formData.personality, formData.animalName);
        setUserId(updatedUserId);
        const res = await checkIfUserIdExists(updatedUserId);
        setIsAvatarExist(res.exists);
        setIsCheckingAvatar(false);
      }
    };
    checkAvatar();
  }, [formData.personality, formData.animalName, isLoginMode]);

  const toggleMode = () => {
    setIsLoginMode((prevMode) => !prevMode);
    setFocused(false);
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  async function handleLogin() {
    const modifiedUserId = modifyUserId(formData.personality, formData.animalName);
    try {
      const access_token = (await logInUser(modifiedUserId, formData.password)).access_token;
      if (!access_token?.length) throw new Error('No access token');
      setCookie('access_token', access_token);
      window.location.replace(returnBackUrl || '/');
    } catch (error) {
      if (error?.response?.status === 401) {
        alert('Invalid email or password');
      } else {
        alert('Something went wrong');
      }
      console.error('Error:', error);
    }
  }

  async function handleSignup() {
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    try {
      const res = await anonUserSignUp({
        userId,
        firstName: capitalizeFirstLetter(formData.personality),
        lastName: capitalizeFirstLetter(formData.animalName),
        password: formData.password,
      });
      alert(res.data.message);
      setFormData({
        ...formData,
        confirmPassword: '',
        password: '',
      });
      setFocused(false);
      setIsLoginMode(true);
    } catch (error) {
      alert(error.response.data.message);
    }
  }

  const handleSubmit = () => {
    if (isLoginMode) {
      handleLogin();
    } else {
      handleSignup();
    }
  };

  return (
    <MainLayout>
      <Box sx={{ m: 'auto', maxWidth: '700px', px: '10px', backgroundColor: BG_COLOR, py: '20px' }}>
        <Box sx={{ padding: '20px', width: '400px', m: 'auto' }}>
          <Typography variant="h4" textAlign="center" mb={2}>
            {isLoginMode ? 'Login' : 'Sign Up'}
          </Typography>
          <Typography variant="body1" textAlign="center" mb={2}>
            {!isLoginMode && <strong style={{ color: PRIMARY_COL }}>Choose Your Avatar</strong>}
          </Typography>
          <Box sx={{ display: 'flex' }}>
            <FormControl>
              <InputLabel id="select-personality">Personality</InputLabel>
              <Select
                labelId="select-personality-id"
                value={formData.personality}
                onChange={handleSelectChange}
                name="personality"
                label="personality"
                sx={{ width: '200px' }}
              >
                {ADJECTIVES.map((personality: string) => (
                  <MenuItem key={personality} value={personality}>
                    {capitalizeFirstLetter(personality)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel id="select-animal-spirit">Animal Spirit</InputLabel>
              <Select
                labelId="select-animal-id"
                value={formData.animalName}
                onChange={handleSelectChange}
                name="animalName"
                label="Animal Spirit"
                sx={{ width: '200px' }}
              >
                {ANIMALS.map((animal: string) => (
                  <MenuItem key={animal} value={animal}>
                    {capitalizeFirstLetter(animal)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          {isCheckingAvatar && <LinearProgress sx={{ mt: 2 }} />}
          {isAvatarExist && (
            <Typography sx={{ color: 'red', fontWeight: 'bold', mt: 1 }}>
              Avatar taken! Pick another one.
            </Typography>
          )}
          <TextField
            label="Enter pin"
            type="password"
            variant="outlined"
            fullWidth
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            onFocus={() => setFocused(true)}
            required
            sx={{
              my: 2,
              textAlign: 'center',
              input: {
                textAlign: 'center',
                ...(focused && {
                  letterSpacing: '0.5rem',
                  fontSize: '2rem',
                }),
              },
            }}
          />
          {!isLoginMode && (
            <TextField
              label="confirm pin"
              type="password"
              variant="outlined"
              fullWidth
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              onFocus={() => setFocused(true)}
              required
              sx={{
                my: 2,
                textAlign: 'center',
                input: {
                  textAlign: 'center',
                  ...(focused && {
                    letterSpacing: '0.5rem',
                    fontSize: '2rem',
                  }),
                },
              }}
            />
          )}
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={
              isCheckingAvatar ||
              isAvatarExist ||
              !formData.personality ||
              !formData.animalName ||
              !formData.password
            }
            sx={{ mt: 2, display: 'block', mx: 'auto' }}
          >
            {isLoginMode ? 'Login' : 'Sign Up'}
          </Button>
          <Button onClick={toggleMode} sx={{ mt: 2, display: 'block', mx: 'auto' }}>
            {isLoginMode ? 'Don’t have an account? Sign Up' : 'Already have an account? Login'}
          </Button>
        </Box>
      </Box>
    </MainLayout>
  );
};

export default AnonLoginPage;
