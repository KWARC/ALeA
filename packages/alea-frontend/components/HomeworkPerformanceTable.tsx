import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { HomeworkStub, LearnerHomeworkInfo, getHomeworkList } from '@alea/spec';
import { PRIMARY_COL } from '@alea/utils';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getLocaleObject } from '../lang/utils';
import { SafeHtml } from '@alea/react-utils';

function HomeworkPerformanceTable({ courseId }: { courseId: string }) {
  const { homeworkPerformanceTable: t, homework: tHW } = getLocaleObject(useRouter());
  const [homeworkData, setHomeworkData] = useState<LearnerHomeworkInfo[]>([]);

  useEffect(() => {
    const getHomeworkData = async () => {
      try {
        const data = await getHomeworkList(courseId);
        const mappedData: LearnerHomeworkInfo[] = data.map((homework: HomeworkStub) => ({
          title: homework.title,
          givenTs: new Date(homework.givenTs).toLocaleDateString('en-GB'),
          dueTs: new Date(homework.dueTs).toLocaleDateString('en-GB'),
          courseId: homework.courseId,
          courseInstance: homework.courseInstance,
          maxPoints: 100,
          myScore: 0,
          avgScore: 0,
          id: homework.id,
        }));
        setHomeworkData(mappedData);
      } catch (error) {
        console.error('Error fetching homework data:', error);
      }
    };

    getHomeworkData();
  }, [courseId]);

  return (
    <>
      <Typography variant="h5" sx={{ m: '30px 0 15px' }}>
        {tHW.givenHomeworks}
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <b>{t.homeworkTitle}</b>
              </TableCell>
              <TableCell>
                <b>{t.givenTs}</b>
              </TableCell>
              <TableCell>
                <b>{t.dueTs}</b>
              </TableCell>
              <TableCell>
                <b>{t.maxPoints}</b>
              </TableCell>
              <TableCell>
                <b>{t.myScore}</b>
              </TableCell>
              <TableCell>
                <b>{t.averageScore}</b>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {homeworkData.map((homework, index) => (
              <TableRow key={index}>
                <TableCell sx={{ color: PRIMARY_COL, wordBreak: 'break-word', minWidth: '100px' }}>
                  <Link
                    href={{
                      pathname: '/homework-doc',
                      query: { id: homework.id, courseId: homework.courseId },
                    }}
                    style={{
                      textDecoration: 'none',
                      color: PRIMARY_COL,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    <SafeHtml html={homework.title} />
                  </Link>
                </TableCell>
                <TableCell sx={{ color: PRIMARY_COL, wordBreak: 'break-word', minWidth: '100px' }}>
                  <Link
                    href={{
                      pathname: '/homework-doc',
                      query: { id: homework.id, courseId },
                    }}
                    style={{
                      textDecoration: 'none',
                      color: PRIMARY_COL,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    {homework.givenTs}
                  </Link>
                </TableCell>
                <TableCell sx={{ color: PRIMARY_COL, wordBreak: 'break-word', minWidth: '100px' }}>
                  {homework.dueTs}
                </TableCell>
                <TableCell sx={{ color: PRIMARY_COL, wordBreak: 'break-word', minWidth: '100px' }}>
                  {homework.maxPoints}
                </TableCell>
                <TableCell sx={{ color: PRIMARY_COL, wordBreak: 'break-word', minWidth: '100px' }}>
                  {homework.myScore}
                </TableCell>
                <TableCell sx={{ color: PRIMARY_COL, wordBreak: 'break-word', minWidth: '100px' }}>
                  {homework.avgScore}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

export default HomeworkPerformanceTable;
