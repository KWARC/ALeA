import { Box, Button } from '@mui/material';
import { logout } from '@stex-react/spec';
import Image from 'next/image';

export function ForceFauLogin() {
  return (
    <Box m="0 auto" p="10px" maxWidth="800px">
      You are currently logged in using your personal email. To access the quizzes, please{' '}
      <Button onClick={logout} sx={{ textTransform: 'none', px: '0' }}>
        <b>log out</b>
      </Button>{' '}
      and then log in again using the FAU IdM by clicking the following button on the login page:
      <br />
      <br />
      <Box display="flex">
        <Box border="2px solid black" flexShrink={1}>
          <Image src="/idm-login.png" width={400} height={300} alt="" />
        </Box>
      </Box>
    </Box>
  );
}
