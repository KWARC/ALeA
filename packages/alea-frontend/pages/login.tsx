import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import {
  fakeLoginUsingRedirect,
  isLoggedIn,
  logInUser,
  loginUsingRedirect,
  logout,
} from '@stex-react/api';
import { BG_COLOR, IS_SERVER, setCookie } from '@stex-react/utils';
import EmailIcon from '@mui/icons-material/Email';
import { NextPage } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useReducer, useState } from 'react';
import { getLocaleObject } from '../lang/utils';
import MainLayout from '../layouts/MainLayout';
import styles from '../styles/utils.module.scss';

const PresetPersonas = [
  { label: 'sabrina', info: 'FAU CS student' },
  { label: 'joy', info: 'Engineering background' },
  { label: 'anushka', info: 'Philosophy background' },
  { label: 'blank', info: 'Empty learner model' },
];

export function LoginInfoBox() {
  const { login: t, logInSystem: l } = getLocaleObject(useRouter());
  return (
    <Box className={styles['descriptive-box']}>
      {t.notesHeader}
      <ul>
        <li>{t.notesPoint1}</li>
        <li>{t.notesPoint2}</li>
        <li>{t.notesPoint3}</li>
        <li>
          {t.notesPoint4}:&nbsp;
          <a
            href="https://gitos.rrze.fau.de/voll-ki/fau/SSFC/-/wikis/home"
            target="_blank"
            rel="noreferrer"
          >
            {l.link}
          </a>
        </li>
      </ul>
    </Box>
  );
}

export function PersonaChooser({
  persona,
  label,
  onPersonaUpdate,
}: {
  persona: string;
  label: string;
  onPersonaUpdate: (label: string) => void;
}) {
  return (
    <FormControl>
      <InputLabel>{label}</InputLabel>
      <Select
        value={persona}
        onChange={(e) => {
          const label = e.target.value;
          onPersonaUpdate(label);
        }}
        variant="standard"
        sx={{ minWidth: '130px' }}
      >
        {PresetPersonas.map((persona) => (
          <MenuItem key={persona.label} value={persona.label}>
            {persona.label}&nbsp;<i>({persona.info})</i>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
const LoginPage: NextPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loggedIn = isLoggedIn();
  const router = useRouter();
  const [fakeId, setFakeId] = useState('');
  const returnBackUrl = router.query.target as string;
  const [clickCount, updateClickCount] = useReducer((x) => x + 1, 0);
  const fakeLogin = clickCount >= 1;
  const { login: t } = getLocaleObject(router);
  const handleEmailChange = (event) => {
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const access_token = (await logInUser(email, password)).access_token;
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
  };

  if (loggedIn && !IS_SERVER) router.push('/');
  return (
    <MainLayout>
      <br />
      <Box sx={{ m: 'auto', maxWidth: '700px', px: '10px' }}>
        <Box
          sx={{
            p: '1.5rem',
            borderRadius: '0.3rem',
            border: '1px solid #dee2e6',
            backgroundColor: BG_COLOR,
          }}
        >
          <br />
          {!loggedIn && fakeLogin && (
            <Autocomplete
              id="free-solo-demo"
              freeSolo
              getOptionLabel={(option) =>
                typeof option === 'string' ? option : option.label
              }
              inputValue={fakeId}
              onInputChange={(event, newInputValue) => {
                setFakeId(newInputValue);
              }}
              sx={{ my: '10px' }}
              options={PresetPersonas}
              renderInput={(params) => <TextField {...params} label="FakeId" />}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  {option.label}&nbsp;<i>({option.info})</i>
                </Box>
              )}
            />
          )}
          {loggedIn ? (
            <>
              {t.alreadyLoggedIn}
              <Button
                fullWidth
                variant="contained"
                size="large"
                sx={{ w: '100%' }}
                onClick={() => logout()}
              >
                {t.logout}
              </Button>
            </>
          ) : (
            <>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => {
                  if (fakeLogin) {
                    if (fakeId)
                      fakeLoginUsingRedirect(fakeId, undefined, returnBackUrl);
                  } else {
                    loginUsingRedirect(returnBackUrl);
                  }
                }}
              >
                {fakeLogin ? (
                  t.fakeLogin
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Image
                      src="https://community.fau.de/wp-content/themes/community.fau-erlangen/img/FAU_Logo_Bildmarke.svg"
                      alt="FAU icon"
                      width={30}
                      height={32}
                      style={{ filter: 'brightness(0) invert(1)' }}
                    />
                    <span style={{ marginLeft: '10px' }}>{t.fauLogin}</span>
                  </Box>
                )}
              </Button>
              <span
                style={{
                  fontFamily: 'Roboto',
                  color: '#777',
                  marginTop: '10px',
                }}
              >
                <span
                  style={{ display: 'inline' }}
                  onDoubleClick={updateClickCount}
                >
                  {t.rememberLogout}
                </span>
                &nbsp;{t.logoutWarning}
                <br />
                <br />
                <Box display="flex" sx={{ margin: '25px 0px' }}>
                  <hr
                    style={{ marginRight: '10px', backgroundColor: 'black' }}
                  />
                  <span
                    style={{
                      fontWeight: 'bold',
                      color: 'black',
                      fontSize: '20px',
                    }}
                  >
                    OR
                  </span>
                  <hr
                    style={{ marginLeft: '10px', backgroundColor: 'black' }}
                  />
                </Box>
                <Box
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <TextField
                    label="Email Address"
                    id="outlined-basic-email"
                    variant="outlined"
                    margin="normal"
                    fullWidth
                    required
                    value={email}
                    onChange={handleEmailChange}
                  />
                  <TextField
                    label="Password"
                    id="outlined-basic-password"
                    variant="outlined"
                    margin="normal"
                    fullWidth
                    required
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    style={{ width: '100%', marginTop: 20 }}
                    onClick={handleSubmit}
                    sx={{
                      padding: '10px 20px',
                    }}
                  >
                    <EmailIcon sx={{ marginRight: '10px' }} />
                    {t.loginWithEmail}
                  </Button>
                  <br />
                  <Typography
                    variant="body2"
                    style={{
                      marginTop: 10,
                      textAlign: 'center',
                      color: 'blue',
                    }}
                  >
                    <Link href="/forgot-password">Forgot your password?</Link>
                  </Typography>
                  <br />
                  <Typography sx={{ color: 'black', marginBottom: '25px' }}>
                    Do not have an account?{' '}
                    <Link
                      href="/signup"
                      style={{ width: '100%', color: 'blue' }}
                    >
                      Sign Up
                    </Link>
                  </Typography>
                </Box>
              </span>
              <br />
              <LoginInfoBox />
            </>
          )}
        </Box>
        <br />
      </Box>
    </MainLayout>
  );
};

export default LoginPage;
