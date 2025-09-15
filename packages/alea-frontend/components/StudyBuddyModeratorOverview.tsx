import { Typography } from '@mui/material';
import { AllCoursesStats } from '@alea/spec';
import { getLocaleObject } from '../lang/utils';
import { useRouter } from 'next/router';

const StudyBuddyModeratorOverview = ({
  overviewData,
}: {
  overviewData: AllCoursesStats;
}) => {
  const { studyBuddy: t } = getLocaleObject(useRouter());
  return (
    <>
      <Typography style={{ fontWeight: 'bold' }}>
        {t.totalUsers + ' : ' + overviewData?.totalUsers}
      </Typography>
      <Typography style={{ fontWeight: 'bold' }}>
        {t.activeUsers + ' : ' + overviewData?.activeUsers}
      </Typography>
      <Typography style={{ fontWeight: 'bold' }}>
        {t.inactiveUsers + ' : ' + overviewData?.inactiveUsers}
      </Typography>
      <Typography style={{ fontWeight: 'bold' }}>
        {t.numberOfConnections + ' : ' + overviewData?.numberOfConnections}
      </Typography>
      <Typography style={{ fontWeight: 'bold' }}>
        {t.unacceptedRequest + ' : ' + overviewData?.unacceptedRequests}
      </Typography>
    </>
  );
};
export default StudyBuddyModeratorOverview;
