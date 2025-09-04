import { Card, CardContent } from '@mui/material';
import { AllCoursesStats, UserStats, getStudyBuddyUsersStats } from '@stex-react/spec';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import StudyBuddyModeratorOverview from './StudyBuddyModeratorOverview';

const StudyBuddyConnectionsGraph = dynamic(() => import('./StudyBuddyConnectionsGraph'), {
  ssr: false,
});

export function StudyBuddyModeratorStats({ courseId }: { courseId: string }) {
  const [overviewData, setOverviewData] = useState<AllCoursesStats>();
  const [connections, setConnections] = useState<UserStats['connections']>([]);
  const [userIdsAndActiveStatus, setUserIdsAndActiveStatus] = useState([]);
  useEffect(() => {
    const fetchData = async () => {
      const data = await getStudyBuddyUsersStats(courseId);
      setOverviewData(data);
      setConnections(data.connections);
      setUserIdsAndActiveStatus(data.userIdsAndActiveStatus);
    };
    fetchData();
  }, [courseId]);

  return (
    <>
      <Card sx={{ mt: '20px', mb: '20px' }}>
        <CardContent>
          <StudyBuddyModeratorOverview overviewData={overviewData} />
          <hr />
          <StudyBuddyConnectionsGraph
            connections={connections}
            userIdsAndActiveStatus={userIdsAndActiveStatus}
          />
        </CardContent>
      </Card>
    </>
  );
}
