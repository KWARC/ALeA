import { Delete, Edit, OpenInNew } from '@mui/icons-material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
} from '@mui/material';
import { getHomework, HomeworkInfo, HomeworkStub } from '@stex-react/spec';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';
import { getLocaleObject } from '../lang/utils';
import { SafeHtml } from '@stex-react/react-utils';

const HomeworkList = ({
  homeworkStubs,
  selectedHomeworkId,
  onCreate,
  handleEdit,
  handleShow,
  confirmDelete,
}: {
  homeworkStubs: HomeworkStub[];
  selectedHomeworkId: number | null;
  onCreate: () => void;
  handleEdit: (homework: HomeworkInfo) => void;
  handleShow: (homework: HomeworkInfo) => void;
  confirmDelete: (homeworkId: number) => void;
}) => {
  const { homeworkManager: t } = getLocaleObject(useRouter());
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          mb: 2,
        }}
      >
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
          {t.homeworks}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => onCreate()}
          sx={{
            borderRadius: '25px',
            marginLeft: '5px',
          }}
        >
          {t.createHomework}{' '}
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ maxHeight: '500px', overflowY: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>{t.title}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t.givenTs}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t.dueTs}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t.feedbackReleaseTs}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t.actions}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {homeworkStubs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="h6" sx={{ textAlign: 'center' }}>
                    {t.noHomeworksAvailable}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {homeworkStubs.map((homework) => {
              const formattedGivenTs = dayjs(homework.givenTs).format('YYYY-MM-DD HH:mm');
              const formattedDueTs = dayjs(homework.dueTs).format('YYYY-MM-DD HH:mm');
              const formattedReleaseDate = dayjs(homework.feedbackReleaseTs).format(
                'YYYY-MM-DD HH:mm'
              );

              return (
                <TableRow key={homework.id}>
                  <TableCell>
                    <SafeHtml html={homework.title} />
                    <Tooltip title={t.viewHomeworkDocument}>
                      <a
                        href={`/homework-doc?id=${homework.id}&courseId=${homework.courseId}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ textDecoration: 'none' }}
                      >
                        <IconButton aria-label={t.viewHomeworkDocument}>
                          <OpenInNew />
                        </IconButton>
                      </a>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{formattedGivenTs}</TableCell>
                  <TableCell>{formattedDueTs}</TableCell>
                  <TableCell>{formattedReleaseDate}</TableCell>
                  <TableCell>
                    <Tooltip title={t.showHomeworkStatistics}>
                      <span>
                        <IconButton
                          color="primary"
                          onClick={async () => {
                            handleShow((await getHomework(homework.id)).homework);
                          }}
                          disabled={selectedHomeworkId === homework.id}
                          aria-label={t.showHomeworkStatistics}
                        >
                          <ShowChartIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={t.editHomework}>
                      <IconButton
                        color="primary"
                        onClick={async () => {
                          handleEdit((await getHomework(homework.id)).homework);
                        }}
                        aria-label={t.editHomework}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t.deleteHomework}>
                      <IconButton
                        color="error"
                        onClick={() => confirmDelete(homework.id)}
                        aria-label={t.deleteHomework}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default HomeworkList;
