import Timeline from '@mui/lab/Timeline';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import { Box } from '@mui/material';
import { DateView } from '@alea/react-utils';
import type { NextPage } from 'next';
import Link from 'next/link';
import {
  NotificationIcon,
  getLinkTarget,
  useNotificationData,
} from '../components/NotificationButton';
import MainLayout from '../layouts/MainLayout';

const AllNotificationsPage: NextPage = () => {
  const sortedItems = useNotificationData();
  return (
    <MainLayout title="All Notifications | ALeA">
      <Box maxWidth="700px" margin="auto">
        <Timeline>
          {sortedItems.map((item) => (
            <TimelineItem
              key={item.postedTimestamp}
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <TimelineOppositeContent
                color="textSecondary"
                sx={{ flex: '0.25 1 100px' }}
              >
                <DateView
                  timestampMs={new Date(item.postedTimestamp)?.getTime()}
                  style={{ fontSize: '14px' }}
                />
              </TimelineOppositeContent>
              <TimelineSeparator sx={{ flex: '0 0 40px' }}>
                <TimelineDot>
                  <NotificationIcon type={item.notificationType} />
                </TimelineDot>
                <TimelineConnector />
              </TimelineSeparator>
              <TimelineContent
                sx={{ overflowWrap: 'anywhere', flex: '1 0 150px' }}
              >
                <Link
                  href={item.link}
                  target={getLinkTarget(item.notificationType)}
                >
                  {item.header.toUpperCase()}
                </Link>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </Box>
    </MainLayout>
  );
};

export default AllNotificationsPage;
