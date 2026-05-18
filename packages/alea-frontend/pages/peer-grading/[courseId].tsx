import { Box } from "@mui/material";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { GradingInterface } from '../../components/nap/GradingInterface';
import MainLayout from '../../layouts/MainLayout';


const PeerGradingListPage: NextPage = () => {
  const router = useRouter();

  const courseId = router.query.courseId as string;
  return (
    <>
      <MainLayout>
        
        <Box
        sx={{
          width: '95%',
          margin: '0 auto auto auto',
        }}
      >
        <GradingInterface isPeerGrading={true} courseId={courseId} />
      </Box>
      </MainLayout>
    </>
  );
};
export default PeerGradingListPage;
