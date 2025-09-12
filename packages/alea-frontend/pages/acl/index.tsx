import { Box, Button, Divider, List, ListItem, ListItemText } from '@mui/material';
import { getAllAclIds } from '@stex-react/spec';
import { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';

const AclPage: NextPage = () => {
  const router = useRouter();
  const [aclIds, setAclIds] = useState<string[]>([]);

  useEffect(() => {
    getAllAclIds().then(setAclIds);
  }, []);

  return (
    <MainLayout title="ACL Page">
      <Box
        sx={{
          m: '0 auto',
          maxWidth: '800px',
          p: '10px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <h1>All ACL&apos;s</h1>
        <Box>
          <Button variant="contained" color="primary" onClick={() => router.push('acl/new')}>
            Create new ACL
          </Button>
        </Box>

        <List>
          {aclIds.map((acl, index) => (
            <Link href={`acl/${acl}`} key={index}>
              <Box>
                <ListItem sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.08)' } }}>
                  <ListItemText primary={acl} primaryTypographyProps={{ fontWeight: 'bold' }} />
                </ListItem>
                {index < aclIds.length - 1 && <Divider />}
              </Box>
            </Link>
          ))}
        </List>
      </Box>
    </MainLayout>
  );
};

export default AclPage;