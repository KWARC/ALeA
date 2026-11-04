import { Box, Button, Divider, List, ListItem, ListItemText, Typography } from '@mui/material';
import { getAllAclIds, isUserMember } from '@alea/spec';
import { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';

const AclPage: NextPage = () => {
  const router = useRouter();
  const [aclIds, setAclIds] = useState<string[]>([]);
  const [isSysAdmin, setIsSysAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    isUserMember('sys-admin').then((ok) => {
      setIsSysAdmin(ok);
      if (!ok) return;
      getAllAclIds().then(setAclIds).catch(() => setAclIds([]));
    });
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
        {isSysAdmin === false ? (
          <Typography variant="h6" color="error">
            You do not have access to the ACL directory. Only sys-admins can view it.
          </Typography>
        ) : isSysAdmin ? (
          <>
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
          </>
        ) : null}
      </Box>
    </MainLayout>
  );
};

export default AclPage;
