import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';

interface LectureScheduleTabProps {
  courseId: string;
}

const LectureScheduleTab: React.FC<LectureScheduleTabProps> = ({ courseId }) => {
  const lectures = [
    { day: 'Monday', time: '10:00 AM – 11:30 AM', room: 'Data Types and Variables' },
    { day: 'Wednesday', time: '02:00 PM – 02:30 PM', room: 'Control Flow' },
    { day: 'Friday', time: '00:00 AM – 10:30 AM', room: 'Functions and Modules' },
  ];

  return (
    <Box p={2}>
      <Typography variant="h6" fontWeight="bold">
        Lecture Schedule for Course ID: {courseId}
      </Typography>

      <Table size="small" sx={{ mt: 1 }}>
        <TableHead>
          <TableRow>
            <TableCell>Day</TableCell>
            <TableCell>Time</TableCell>
            <TableCell>Room</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lectures.map((lecture, idx) => (
            <TableRow key={idx}>
              <TableCell>{lecture.day}</TableCell>
              <TableCell>{lecture.time}</TableCell>
              <TableCell>{lecture.room}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default LectureScheduleTab;
