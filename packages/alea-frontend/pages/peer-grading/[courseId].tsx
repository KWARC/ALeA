import { Box } from "@mui/material";
import { CourseInfo } from "@alea/utils";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { GradingInterface } from '../../components/nap/GradingInterface';
import MainLayout from '../../layouts/MainLayout';
import { useState } from "react";
import { CourseHeader } from '../../components/CourseHeader';


const PeerGradingListPage: NextPage = () => {
  const router = useRouter();

  const courseId = router.query.courseId as string;
  const [courses, _] = useState<Record<string, CourseInfo> | undefined>(undefined);
  const courseInfo = courses?.[courseId];
  return (
    <>
      <MainLayout>
        <CourseHeader
          courseName={courseInfo?.courseName}
          imageLink={courseInfo?.imageLink}
          courseId={courseId}
        />
        
        <Box
        sx={{
          width: '95%',
          margin: '10vh auto auto auto',
        }}
      >
        <GradingInterface isPeerGrading={true} courseId={courseId} />
      </Box>
      </MainLayout>
    </>
  );
};
export default PeerGradingListPage;