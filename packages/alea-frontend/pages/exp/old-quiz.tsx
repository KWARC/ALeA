import {
  Box,
  Select,
  MenuItem,
  Typography,
  List,
  ListItem,
  Button,
  Paper,
  Divider,
} from '@mui/material';
import { getOldQuizFiles, getOldQuizFile, getOldSemesters } from '@stex-react/api';
import MainLayout from 'packages/alea-frontend/layouts/MainLayout';
import { useEffect, useState } from 'react';

function extractCourseIds(files: string[], semester: string): Promise<string[]> {
  return Promise.all(
    files.map((filename) => getOldQuizFile(semester, filename).catch(() => null))
  ).then((quizFiles) => {
    const courseIds = new Set<string>();
    quizFiles.forEach((qc) => {
      if (qc && qc.courseId) courseIds.add(qc.courseId);
    });
    return Array.from(courseIds);
  });
}

function OldQuizPage() {
  const [semesters, setSemesters] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [files, setFiles] = useState<string[]>([]);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [quizContent, setQuizContent] = useState<any>(null);
  const [courseFileInfos, setCourseFileInfos] = useState<
    { filename: string; quizStartTs?: number }[]
  >([]);

  useEffect(() => {
    getOldSemesters().then(setSemesters);
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      getOldQuizFiles(selectedSemester).then(async (allFiles) => {
        setFiles(allFiles);
        setSelectedCourseId('');
        setSelectedFile('');
        setQuizContent(null);
        const ids = await extractCourseIds(allFiles, selectedSemester);
        setCourseIds(ids);
      });
    }
  }, [selectedSemester]);

  useEffect(() => {
    if (selectedCourseId) {
      Promise.all(
        files.map((filename) =>
          getOldQuizFile(selectedSemester, filename)
            .then((qc) => ({
              filename,
              courseId: qc.courseId,
              quizStartTs: qc.quizStartTs,
            }))
            .catch(() => null)
        )
      ).then((fileInfos) => {
        const filtered = fileInfos
          .filter((f) => f && f.courseId === selectedCourseId)
          .map((f) => ({ filename: f.filename, quizStartTs: f.quizStartTs }));
        setCourseFileInfos(filtered);
        setSelectedFile('');
        setQuizContent(null);
      });
    }
  }, [selectedCourseId, selectedSemester, files]);

  const handleFileClick = (filename: string) => {
    setSelectedFile(filename);
    getOldQuizFile(selectedSemester, filename).then(setQuizContent);
  };

  return (
    <MainLayout title="Old Quiz | ALeA">
      <Box sx={{ maxWidth: 1000, mx: 'auto', mt: 4, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box sx={{ width: 320 }}>
            <Typography variant="h6" gutterBottom>
              Semester
            </Typography>
            <Select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              displayEmpty
              fullWidth
              sx={{ mb: 2 }}
            >
              <MenuItem value="" disabled>
                Select semester
              </MenuItem>
              {semesters.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>

            {selectedSemester && (
              <>
                <Typography variant="h6" gutterBottom>
                  Course IDs
                </Typography>
                <List>
                  {courseIds.map((cid) => (
                    <ListItem key={cid} disablePadding>
                      <Button
                        variant={selectedCourseId === cid ? 'contained' : 'outlined'}
                        onClick={() => setSelectedCourseId(cid)}
                        fullWidth
                      >
                        {cid}
                      </Button>
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {selectedCourseId && (
              <>
                <Typography variant="h6" gutterBottom>
                  Quiz Files for <b>{selectedCourseId}</b>
                </Typography>
                <List>
                  {[...courseFileInfos]
                    .sort((a, b) => b?.quizStartTs - a.quizStartTs)
                    .map(({ filename, quizStartTs }) => (
                      <ListItem key={filename} disablePadding>
                        <Button
                          variant={selectedFile === filename ? 'contained' : 'outlined'}
                          onClick={() => handleFileClick(filename)}
                          fullWidth
                        >
                          {quizStartTs && new Date(quizStartTs).toLocaleDateString()}
                          {` (${filename.split('.')[0]})`}
                        </Button>
                      </ListItem>
                    ))}
                </List>
              </>
            )}
          </Box>
          <Box sx={{ flex: 1 }}>
            {quizContent && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Problems
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {quizContent.problems &&
                typeof quizContent.problems === 'object' &&
                Object.keys(quizContent.problems).length > 0 ? (
                  Object.entries(quizContent.problems).map(([pid, html]: [string, string]) => (
                    <Box key={pid} sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        Problem ID: {pid}
                      </Typography>
                      <div dangerouslySetInnerHTML={{ __html: html }} />
                      <Divider sx={{ mt: 2 }} />
                    </Box>
                  ))
                ) : (
                  <Typography color="text.secondary">
                    No problems found in this quiz file.
                  </Typography>
                )}
              </Paper>
            )}
          </Box>
        </Box>
      </Box>
    </MainLayout>
  );
}

export default OldQuizPage;
