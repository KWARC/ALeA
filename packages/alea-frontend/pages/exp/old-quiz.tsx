import { useState, useEffect } from 'react';
import { Box, Typography, Select, MenuItem, List, ListItem, Button, Paper } from '@mui/material';
import MainLayout from 'packages/alea-frontend/layouts/MainLayout';

async function fetchSemesters() {
  const res = await fetch('/api/old-quiz/semesters');
  return res.json();
}
async function fetchFiles(semester: string) {
  const res = await fetch(`/api/old-quiz/files?semester=${semester}`);
  return res.json();
}
async function fetchQuizFile(semester: string, filename: string) {
  const res = await fetch(`/api/old-quiz/file?semester=${semester}&filename=${filename}`);
  return res.json();
}

function OldQuizPage() {
  const [semesters, setSemesters] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [quizContent, setQuizContent] = useState<any>(null);

  useEffect(() => {
    fetchSemesters().then(setSemesters);
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      fetchFiles(selectedSemester).then(setFiles);
      setSelectedFile('');
      setQuizContent(null);
    }
  }, [selectedSemester]);

  const handleFileClick = (filename: string) => {
    setSelectedFile(filename);
    fetchQuizFile(selectedSemester, filename).then(setQuizContent);
  };

  return (
    <MainLayout title="Old Quiz | ALeA">
      <Box>
        <Typography variant="h6">Select Semester</Typography>
        <Select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
          displayEmpty
          sx={{ minWidth: 200, mb: 2 }}
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
          <Box>
            <Typography variant="subtitle1">Quiz Files</Typography>
            <List>
              {files.map((f) => (
                <ListItem key={f} disablePadding>
                  <Button onClick={() => handleFileClick(f)}>{f}</Button>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
        {quizContent && (
          <Paper sx={{ mt: 2, p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Problems</Typography>
            {quizContent.problems && typeof quizContent.problems === "object" && Object.keys(quizContent.problems).length > 0 ? (
              Object.entries(quizContent.problems).map(([pid, html]: [string, string]) => (
                <Paper key={pid} sx={{ my: 2, p: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Problem ID: {pid}</Typography>
                  <div dangerouslySetInnerHTML={{ __html: html }} />
                </Paper>
              ))
            ) : (
              <Typography color="text.secondary">No problems found in this quiz file.</Typography>
            )}
          </Paper>
        )}
      </Box>
    </MainLayout>
  );
}

export default OldQuizPage;