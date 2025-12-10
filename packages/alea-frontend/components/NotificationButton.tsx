import styled from '@emotion/styled';
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LightbulbIcon from '@mui/icons-material/Lightbulb';

import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import { Box, IconButton, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import {
  Notification,
  NotificationType,
  getNotificationSeenTime,
  getUserNotifications,
  isLoggedIn,
  updateNotificationSeenTime,
} from '@alea/spec';
import { DateView } from '@alea/react-utils';
import { PRIMARY_COL, localStore } from '@alea/utils';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getLocaleObject } from '../lang/utils';
import { SYSTEM_UPDATES } from '../system-updates';

const bounce = keyframes` 0% { transform: rotate(0) translateY(0px); color: white; }
15% { transform: rotate(5deg) translateY(-1px); }
30% { transform: rotate(-5deg) translateY(-2px);}
45% { transform: rotate(4deg) translateY(-3px); }
60% { transform: rotate(-4deg) translateY(-3px); color: red; }
75% { transform: rotate(2deg) translateY(-2px); }
85% { transform: rotate(-2deg) translateY(-1px); }
92% { transform: rotate(1deg) translateY(-1px); }
100% { transform: rotate(0) translateY(0px); }
`;
const BouncingBox = styled('div')({
  marginTop: '7px',
  animation: `${bounce} 1s infinite ease`,
});

export function NotificationIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case NotificationType.STUDY_BUDDY:
      return <Diversity3Icon color="primary" />;
    case NotificationType.COMMENT:
      return <QuestionAnswerIcon color="primary" />;
    case NotificationType.REPORT_PROBLEM:
      return <ReportProblemIcon color="primary" />;
    case NotificationType.SUGGESTION:
      return <LightbulbIcon color="primary" />;
    case NotificationType.SYSTEM:
    default:
      return <DisplaySettingsIcon color="primary" />;
  }
}

export function getLinkTarget(notificationType) {
  return notificationType === NotificationType.REPORT_PROBLEM ||
    notificationType === NotificationType.SUGGESTION
    ? '_blank'
    : undefined;
}

function NotificationBell({ shouldRing }: { shouldRing: boolean }) {
  if (!shouldRing) return <NotificationsIcon htmlColor="white" />;
  return (
    <BouncingBox>
      <NotificationsIcon htmlColor="#0039c1" />
    </BouncingBox>
  );
}

export function changeSystemUpdateToNotification(systemUpdate: any, locale: string): Notification {
  const { content, header, content_de, header_de, postedTimestamp } = systemUpdate;
  return {
    postedTimestamp,
    link: `/updates#${systemUpdate.id}`,
    content: (locale === 'de' ? content_de : content) ?? content,
    header: (locale === 'de' ? header_de : header) ?? header,
    notificationType: NotificationType.SYSTEM,
  };
}

export function useNotificationData() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const locale = useRouter().locale || 'en';
  useEffect(() => {
    getUserNotifications(locale).then(setNotifications);
  }, [locale]);

  const allItems = [
    ...notifications,
    ...SYSTEM_UPDATES.map((update) => changeSystemUpdateToNotification(update, locale)),
  ];

  const sortedItems = allItems.sort((a, b) => {
    const timestampA = new Date(a.postedTimestamp)?.getTime() || 0;
    const timestampB = new Date(b.postedTimestamp)?.getTime() || 0;
    return timestampB - timestampA;
  });
  return sortedItems;
}

function NotificationButton({ bgColor }: { bgColor?: string }) {
  const router = useRouter();
  const { notification: t } = getLocaleObject(router);
  const [notificationSeenTime, setNotificationSeenTime] = useState<string | undefined>(undefined);
  // System info menu crap start
  const [anchorEl, setAnchorEl] = useState<any>(null);
  const open = Boolean(anchorEl);
  const handleClose = () => setAnchorEl(null);
  // System info menu crap end

  const sortedItems = useNotificationData();

  useEffect(() => {
    if (isLoggedIn()) {
      getNotificationSeenTime().then(setNotificationSeenTime);
    }
  }, []);

  function topUpdate() {
    if (!sortedItems?.length) return '';
    return new Date(sortedItems[0].postedTimestamp).getTime().toString();
  }

  function shouldRing(topUpdate) {
    if (!isLoggedIn()) {
      const lastNotificationSeenTime = localStore?.getItem('notification-seen-time');
      return lastNotificationSeenTime !== topUpdate;
    } else {
      return notificationSeenTime !== undefined && notificationSeenTime.toString() !== topUpdate;
    }
  }

  async function handleUpdate(e) {
    setAnchorEl(e.currentTarget);
    if (!isLoggedIn()) {
      localStore?.setItem('notification-seen-time', topUpdate());
    } else {
      setNotificationSeenTime(topUpdate());
      await updateNotificationSeenTime(topUpdate());
    }
  }
  return (
    <>
      <Tooltip title={t.notifications}>
        <IconButton onClick={(e) => handleUpdate(e)}>
          <NotificationBell shouldRing={shouldRing(topUpdate())} />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        sx={{ '& .MuiMenu-list': { pb: 0 } }}
      >
        {sortedItems.slice(0, 7).map((item, idx) => (
          <Link 
            key={`${item.link}-${item.postedTimestamp}`} 
            href={item.link} 
            target={getLinkTarget(item.notificationType)}
          >
            <MenuItem onClick={handleClose}>
              <Box display="flex" alignItems="center">
                <Box marginRight="10px">
                  <NotificationIcon type={item.notificationType} />
                </Box>
                <Box>
                  {item.header}
                  <Typography display="block" variant="body2" color="gray">
                    <DateView
                      timestampMs={new Date(item.postedTimestamp)?.getTime()}
                      style={{ fontSize: '14px' }}
                    />
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          </Link>
        ))}
        <Box textAlign="center" p="8px" bgcolor={PRIMARY_COL}>
          <Link href="/all-notifications">
            <Typography style={{ color: 'white' }}>{t.allNotifications}</Typography>
          </Link>
        </Box>
      </Menu>
    </>
  );
}

export default NotificationButton;
