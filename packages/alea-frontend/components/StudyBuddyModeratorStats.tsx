import { Card, CardContent } from '@mui/material';
import { AllCoursesStats, UserStats, getStudyBuddyUsersStats } from '@alea/spec';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import StudyBuddyModeratorOverview from './StudyBuddyModeratorOverview';

const StudyBuddyConnectionsGraph = dynamic(() => import('./StudyBuddyConnectionsGraph'), {
  ssr: false,
});

export function StudyBuddyModeratorStats({ courseId, institutionId }: { courseId: string; institutionId: string }) {
  // TODO(M5): make instanceId dynamic
  const instanceId = 'WS25-26';
  const [overviewData, setOverviewData] = useState<AllCoursesStats>();
  const [connections, setConnections] = useState<UserStats['connections']>([]);
  const [userIdsAndActiveStatus, setUserIdsAndActiveStatus] = useState([]);
  useEffect(() => {
    const fetchData = async () => {
      const data = await getStudyBuddyUsersStats(courseId, instanceId, institutionId);
      setOverviewData(data);
      setConnections(data.connections);
      setUserIdsAndActiveStatus(data.userIdsAndActiveStatus);
    };
    fetchData();
  }, [courseId, instanceId, institutionId]);

  return (
    <>
      <Card sx={{ my: 2.5}}>
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
