import { logout } from '@alea/spec';
import { NextPage } from 'next';

import { Button } from '@mui/material';
import MainLayout from '../layouts/MainLayout';

const Logout: NextPage = () => {
  return (
    <MainLayout>
      <Button variant="contained" onClick={async () => logout()}>
        Logout
      </Button>
    </MainLayout>
  );
};

export default Logout;
