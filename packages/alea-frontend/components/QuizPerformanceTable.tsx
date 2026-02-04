import { SafeFTMLFragment } from '@alea/stex-react-renderer';
import InfoIcon from '@mui/icons-material/Info';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  GetPreviousQuizInfoResponse,
  QuizStubInfo,
  RecorrectionInfo,
  getPreviousQuizInfo,
} from '@alea/spec';
import { SafeHtml } from '@alea/react-utils';
import { NoMaxWidthTooltip } from '@alea/stex-react-renderer';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getLocaleObject } from '../lang/utils';

function RecorrectionInfoDisp({ recorrectionInfo }: { recorrectionInfo?: RecorrectionInfo[] }) {
  const { quizPerformanceTable: t } = getLocaleObject(useRouter());
  if (!recorrectionInfo?.length) return null;
  return (
    <NoMaxWidthTooltip
      title={
        <Box
          maxWidth="600px"
          color="#333"
          border="1px solid #CCC"
          p="5px"
          borderRadius="5px"
          boxShadow="2px 7px 31px 8px rgba(0,0,0,0.33)"
        >
          <Typography variant="h6">{t.quizRecorrected}</Typography>
          <ul>
            {recorrectionInfo.map((r, idx) => (
              <li key={idx} style={{ marginBottom: '10px' }}>
                <Typography variant="body1">
                  {t.theProblem}{' '}
                  <b>
                    <SafeHtml html={r.problemHeader || r.problemUri} />
                  </b>
                  &nbsp;{t.wasRecorrected} ({dayjs(r.recorrectedTs).format('MMM DD')}).
                  <br />
                  <SafeHtml html={r.description} />
                </Typography>
              </li>
            ))}
          </ul>
        </Box>
      }
    >
      <InfoIcon />
    </NoMaxWidthTooltip>
  );
}

function QuizPerformanceTable({
  courseId,
  quizList,
  header,
}: {
  courseId: string;
  quizList: QuizStubInfo[];
  header: string;
}) {
  const { quizPerformanceTable: t } = getLocaleObject(useRouter());
  const [previousQuizData, setPreviousQuizData] = useState<GetPreviousQuizInfoResponse>();
  useEffect(() => {
    getPreviousQuizInfo(courseId).then(setPreviousQuizData);
  }, [courseId]);
  return (
    <>
      <Typography variant="h5" sx={{ m: '30px 0 15px' }}>
        {header}
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ wordBreak: 'break-word' }}>
                <b>{t.quizName}</b>
              </TableCell>
              <TableCell sx={{ wordBreak: 'break-word' }}>
                <b>{t.quizDate}</b>
              </TableCell>
              <TableCell sx={{ wordBreak: 'break-word' }}>
                <b>{t.maxPoints}</b>
              </TableCell>
              {/* Showing my score contributed to performance issues during the quiz.
              <TableCell sx={{ wordBreak: 'break-word' }}>
                <b>{t.myScore}</b>
              </TableCell> */}
              <TableCell sx={{ wordBreak: 'break-word' }}>
                <b>{t.averageScore}</b>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {quizList
              .sort((a, b) => b.quizStartTs - a.quizStartTs)
              .map((quiz) => (
                <TableRow key={quiz.quizId}>
                  <TableCell
                    sx={{
                      color: 'primary.main',
                      wordBreak: 'break-word',
                      minWidth: '100px',
                    }}
                  >
                    <Box display="flex" alignItems="center">
                      <Link href={`/quiz/${quiz.quizId}`} style={{ marginRight: '5px' }}>
                        <SafeFTMLFragment
                          key={quiz.title ?? ''}
                          fragment={{
                            type: 'HtmlString',
                            html: quiz.title ?? '<i>Untitled</i>',
                            uri: undefined,
                          }}
                        />
                      </Link>
                      <RecorrectionInfoDisp
                        recorrectionInfo={previousQuizData?.quizInfo[quiz.quizId]?.recorrectionInfo}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Tooltip
                      title={`${dayjs(quiz.quizStartTs).format('MMM-DD HH:mm')} to ${dayjs(
                        quiz.quizEndTs
                      ).format('MMM-DD HH:mm')}`}
                    >
                      <span>{dayjs(quiz.quizStartTs).format('MMM-DD')}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{previousQuizData?.quizInfo[quiz.quizId]?.maxPoints}</TableCell>
                  {/* <TableCell>
                    {previousQuizData?.quizInfo[quiz.quizId]?.score?.toFixed(2)}
                  </TableCell> */}
                  <TableCell>
                    {previousQuizData?.quizInfo[quiz.quizId]?.averageScore?.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

export default QuizPerformanceTable;
