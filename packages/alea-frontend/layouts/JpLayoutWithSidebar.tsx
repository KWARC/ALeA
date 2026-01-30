import React, { useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Header } from '../components/Header';
import { PRIMARY_COL } from '@alea/utils';
import MenuIcon from '@mui/icons-material/Menu';
import { useRouter } from 'next/router';
import DashboardIcon from '@mui/icons-material/Dashboard';
import {
  AccountCircle,
  AssignmentTurnedIn,
  BarChart,
  Close,
  GroupAdd,
  PostAdd,
  Send,
  Work,
} from '@mui/icons-material';
import Head from 'next/head';

const Sidebar = ({
  drawerOpen,
  setDrawerOpen,
  role,
}: {
  drawerOpen: boolean;
  setDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  role: 'student' | 'recruiter' | 'admin';
}) => {
  const router = useRouter();
  const menuItems = {
    student: [
      { label: 'Dashboard', path: '/job-portal/student/dashboard', icon: <DashboardIcon /> },
      { label: 'Search Job', path: '/job-portal/search-job', icon: <Work /> },
      {
        label: 'Applications',
        path: '/job-portal/student/applications',
        icon: <AssignmentTurnedIn />,
      },
      { label: 'Profile', path: '/job-portal/student/profile', icon: <AccountCircle /> },
      {
        label: 'Statistics',
        path: '',
        icon: <BarChart />,
        action: () => alert('Functionality disabled as of now'),
      },
    ],
    recruiter: [
      { label: 'Dashboard', path: '/job-portal/recruiter/dashboard', icon: <DashboardIcon /> },
      { label: 'Create Job', path: '/job-portal/recruiter/create-job', icon: <PostAdd /> },
      {
        label: 'Applications',
        path: '/job-portal/recruiter/applications',
        icon: <AssignmentTurnedIn />,
      },
      {
        label: ' Make Offer',
        path: '/job-portal/recruiter/make-offer',
        icon: <Send />,
      },
      { label: 'Profile', path: '/job-portal/recruiter/profile', icon: <AccountCircle /> },
      // { label: 'Statistics', path: '/job-portal/recruiter/statistics', icon: <BarChart /> },
      {
        label: 'Invite Colleague',
        path: '/job-portal/recruiter/invite',
        icon: <GroupAdd />,
      },
    ],
    admin: [
      { label: 'Admin Dashboard', path: '/job-portal/admin/dashboard' },
      { label: 'Manage Users', path: '/job-portal/admin/users' },
      { label: 'Manage Jobs', path: '/job-portal/admin/jobs' },
      { label: 'Reports', path: '/job-portal/admin/reports' },
      { label: 'Settings', path: '/job-portal/admin/settings' },
    ],
  };
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  return (
    <Drawer
      variant={isMdUp ? 'permanent' : 'temporary'}
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      ModalProps={{ keepMounted: true, BackdropProps: { invisible: true } }}
      sx={{
        width: isMdUp ? (drawerOpen ? 270 : 120) : 270,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: isMdUp ? (drawerOpen ? 270 : 120) : 270,
          top: isMdUp ? 0 : 64,
          height: isMdUp ? '100%' : 'calc(100% - 64px)',
          background: 'linear-gradient(to bottom, #806BE7, #4A69E1, #525AE2, #5C49E0)',
          transition: 'width 0.3s',
          borderRadius: isMdUp ? '0 15px 15px 0' : 0,
        },
        zIndex: isMdUp ? 0 : 1300,
      }}
    >
      <List>
        <ListItem onClick={() => setDrawerOpen(!drawerOpen)}>
          <ListItemIcon>
            {drawerOpen ? <Close sx={{ color: 'white' }} /> : <MenuIcon sx={{ color: 'white' }} />}
          </ListItemIcon>
        </ListItem>
        {menuItems[role]?.map(({ label, path, action, icon }) => {
          const isActive = router.pathname === path;
          const item = (
            <ListItem
              onClick={() => {
                if (action) {
                  action();
                } else {
                  router.push(path);
                }
              }}
              sx={{
                bgcolor: isActive ? '#f9f5f2' : 'transparent',
                color: isActive ? '#4A69E1' : '#f9f5f2',
                pr: 4,
                borderRadius: '30px 0 0px 30px ',
                '&:hover': isActive
                  ? { bgcolor: 'white' }
                  : {
                      bgcolor: 'rgba(249, 245, 242, 0.1)',
                    },
                '&:hover .MuiListItemIcon-root': {
                  color: PRIMARY_COL,
                },
              }}
            >
              <ListItemIcon sx={{ color: isActive ? PRIMARY_COL : 'white' }}>
                {icon || <DashboardIcon />}
              </ListItemIcon>
              {drawerOpen && <ListItemText primary={label} />}
            </ListItem>
          );

          return (
            <Box
              key={path}
              sx={{
                p: '4px',
              }}
            >
              {drawerOpen ? (
                item
              ) : (
                <Tooltip title={label} placement="right">
                  {item}
                </Tooltip>
              )}
            </Box>
          );
        })}
      </List>
    </Drawer>
  );
};

const JpLayoutWithSidebar = ({
  role,
  children,
  title,
  description,
}: {
  role: 'student' | 'recruiter' | 'admin';
  children: any;
  title?: string;
  description?: string;
}) => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <Box
      sx={{
        display: 'flex',
        height: '100dvh',
        backgroundColor: '#f4f4f4',
      }}
    >
      <Head>
        <title>{title || 'ALeA Job Portal'}</title>
        <meta
          name="description"
          content={
            description ||
            'ALeA Job Portal – student profiles, job applications, and recruiter access'
          }
        />
        <link
          rel="icon"
          href="https://www.voll-ki.fau.de/wp-content/themes/FAU-Einrichtungen/img/socialmedia/favicon.ico"
        />
      </Head>
      <Sidebar drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} role={role} />
      <Box
        sx={{
          borderRadius: '32px',
          bgcolor: '#f9f5f2',
          ml: {
            xs: 0,
            md: '-64px',
          },
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Header headerBgColor="#f9f5f2" />
        <Box
          sx={{
            overflowY: 'auto',
            flexGrow: 1,
            pb: '10px',
            position: 'relative',
            bgcolor: '#f9f5f2',
          }}
        >
          {!isMdUp && (
            <IconButton
              onClick={() => setDrawerOpen(!drawerOpen)}
              sx={{
                position: 'sticky',
                top: 0,
                left: 0,
                zIndex: 1000,
                bgcolor: '#fff',
                color: PRIMARY_COL,
                borderRadius: '50%',
                m: 1,
                boxShadow: 1,
              }}
            >
              {drawerOpen ? <Close /> : <MenuIcon />}{' '}
            </IconButton>
          )}

          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default JpLayoutWithSidebar;
