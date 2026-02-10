import { useMatomo } from '@jonkoops/matomo-tracker-react';
import HelpIcon from '@mui/icons-material/Help';
import WarningIcon from '@mui/icons-material/Warning';
import { Box, Button, IconButton, Menu, MenuItem, Toolbar, Tooltip } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import { logout } from '@alea/spec';
import { CountryFlag, useCurrentUser, useIsLoggedIn } from '@alea/react-utils';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getLocaleObject } from '../lang/utils';
import styles from '../styles/header.module.scss';
import NotificationButton from './NotificationButton';
import { useColorMode } from '../contexts/ColorModeContext';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';

export const HIDE_BANNER_ITEM = 'hide-survey-banner';

function ThemeToggleButton() {
  const { mode, setMode } = useColorMode();

  const handleModeChange = () => {
    if (mode === 'light') {
      setMode('dark');
    } else if (mode === 'dark') {
      setMode('system');
    } else {
      setMode('light');
    }
  };

  const title = `${mode.charAt(0).toUpperCase() + mode.slice(1)} mode`;

  return (
    <Tooltip title={title}>
      <IconButton onClick={handleModeChange} sx={{ color: 'white','&:hover': {
      bgcolor:  'action.hover',} }}>
        {mode === 'dark' ? (
          <Brightness4Icon />
        ) : mode === 'light' ? (
          <Brightness7Icon />
        ) : (
          <SettingsBrightnessIcon />
        )}
      </IconButton>
    </Tooltip>
  );
}

function UserButton() {
  const router = useRouter();
  const { header: t } = getLocaleObject(router);

  // Menu crap Start
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  // Menu crap End
  const { pushInstruction } = useMatomo();
  const { user } = useCurrentUser();

  useEffect(() => {
    if (!user) return;
    pushInstruction('setUserId', user.userId);
  }, [user]);
  const displayName = user?.givenName ?? 'User';

  return (
    <Box whiteSpace="nowrap">
      <Button
        sx={{
          color: 'black',
          border: '1px solid black',
          textTransform: 'none',
        }}
        onClick={handleClick}
      >
        {displayName}
      </Button>
      <Menu id="basic-menu" anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem
          onClick={() => {
            router.push('/my-profile');
            handleClose();
          }}
        >
          {t.profile}
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleClose();
            logout();
          }}
        >
          {t.logOut}
        </MenuItem>
      </Menu>
    </Box>
  );
}

function LanguageButton() {
  const router = useRouter();
  const { locale } = router;
  const { header: t } = getLocaleObject(router);

  // Menu crap Start
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  // Menu crap End

  function changeLocale(locale: string) {
    const { pathname, asPath, query } = router;
    // change just the locale and maintain all other route information including href's query
    router.replace({ pathname, query }, asPath, { locale });
  }
  return (
    <Box whiteSpace="nowrap">
      <Tooltip title={t.changeLanguage}>
        <IconButton onClick={handleClick}>
          <CountryFlag flag={locale === 'en' ? 'gb' : locale} size="28x21" size2="56x42" />
        </IconButton>
      </Tooltip>
      <Menu id="basic-menu" anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem
          onClick={() => {
            changeLocale('en');
            handleClose();
          }}
        >
          <CountryFlag flag="gb" size="28x21" size2="56x42" />
          &nbsp; English
        </MenuItem>
        <MenuItem
          onClick={() => {
            changeLocale('de');
            handleClose();
          }}
        >
          <CountryFlag flag="de" size="28x21" size2="56x42" />
          &nbsp; Deutsch
        </MenuItem>
      </Menu>
    </Box>
  );
}

export function Header({ headerBgColor }: { headerBgColor?: string }) {
  const { loggedIn } = useIsLoggedIn();
  const router = useRouter();
  const { header: t } = getLocaleObject(router);
  const background = headerBgColor
    ? `${headerBgColor} !important`
    : process.env.NEXT_PUBLIC_SITE_VERSION === 'production'
    ? undefined
    : process.env.NEXT_PUBLIC_SITE_VERSION === 'staging'
    ? 'crimson !important'
    : 'blue !important';

  return (
    <AppBar
      position="sticky"
      sx={{
        top: '-120px',
        transition: 'top 0.4s ease-out',
      }}
    >
      <Toolbar className={styles['toolbar']} sx={{ background }}>
        <Link href="/" passHref>
          <Tooltip
            placement="right"
            title={
              <Tooltip title={t.headerWarning}>
                <WarningIcon fontSize="large" sx={{ cursor: 'pointer', color: "error.600"}} />
              </Tooltip>
            }
          >
            <Box display="flex" flexWrap="nowrap" alignItems="center">
              <Image
                src="/alea-logo.svg"
                alt="ALᴇA Logo"
                width={99}
                height={64}
                style={{ cursor: 'pointer' }}
                priority={true}
              />
            </Box>
          </Tooltip>
        </Link>
        <Box>
          <Box display="flex" alignItems="center">
            <NotificationButton bgColor="primary.400" />
            {/* <ThemeToggleButton /> */}
            <Link href="/help" tabIndex={-1}>
              <Tooltip title={t.helpCenter}>
                <IconButton sx={{ bgcolor: "primary.main", ml: '5px' }}>
                  <HelpIcon htmlColor="white" />
                </IconButton>
              </Tooltip>
            </Link>
            <LanguageButton />
            {loggedIn ? (
              <UserButton />
            ) : (
              <Button
                sx={{ color: 'black', border: '1px solid black' }}
                onClick={() => {
                  // Don't change target when user reclicks 'Login' button.
                  if (window.location.pathname === '/login') return;
                  router.push('/login?target=' + encodeURIComponent(window.location.href));
                }}
              >
                {t.login}
              </Button>
            )}
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}