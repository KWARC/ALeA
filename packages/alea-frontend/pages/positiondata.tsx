import { ContentCopy } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  IconButton,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';

const PositionDataSelector: React.FC = () => {
  const [deviceIds, setDeviceIds] = useState<string[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [storedDeviceId, setStoredDeviceId] = useState<string | null>(null);
  const [recordingIds, setRecordingIds] = useState<string[]>([]);
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [loadingDeviceId, setLoadingDeviceId] = useState<boolean>(false);
  const [loadingRecordingId, setLoadingRecordingId] = useState<boolean>(false);
  const [loadingFileContent, setLoadingFileContent] = useState<boolean>(false);
  const [conceptTracking, setConceptTracking] = useState<boolean>(false);

  useEffect(() => {
    setLoadingDeviceId(true);

    axios
      .get('/api/get-concept-position')
      .then((r) => {
        setDeviceIds(r.data || []);
        const storedDeviceId = localStorage.getItem('deviceId');
        setStoredDeviceId(storedDeviceId);
        if (storedDeviceId && r.data.includes(storedDeviceId)) {
          setSelectedDeviceId(storedDeviceId);
          handleDeviceIdSelect(storedDeviceId);
        }
      })
      .catch((err) => console.error('Error fetching device lists:', err))
      .finally(() => setLoadingDeviceId(false));
    const storedConceptTrackingMode = localStorage.getItem('concept-tracking');
    setConceptTracking(storedConceptTrackingMode === 'true');
  }, []);

  const handleDeviceIdSelect = (folder: string) => {
    setSelectedDeviceId(folder);
    setSelectedRecordingId(null);
    setFileContent(null);
    setLoadingRecordingId(true);
    axios
      .get('/api/get-concept-position', {
        params: { deviceId: folder },
      })
      .then((r) => {
        setRecordingIds(r.data || []);
      })
      .catch((err) => console.error('Error fetching recordingIds:', err))
      .finally(() => setLoadingRecordingId(false));
  };

  const handleRecordingIdSelect = async (file: string) => {
    setSelectedRecordingId(file);
    if (!selectedDeviceId) return;
    setLoadingFileContent(true);

    try {
      const response = await axios.get(`/api/get-concept-position`, {
        params: {
          deviceId: selectedDeviceId,
          recordingId: file,
        },
      });
      setFileContent(response.data || 'Error reading file');
    } catch (err) {
      console.error('Error reading file:', err);
      setFileContent('Error fetching file content');
    } finally {
      setLoadingFileContent(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!fileContent) return;

    try {
      await navigator.clipboard.writeText(fileContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Error copying text:', err);
    }
  };
  const toggleConceptTrackingMode = () => {
    const newMode = !conceptTracking;
    setConceptTracking(newMode);
    localStorage.setItem('concept-tracking', newMode.toString());
  };

  return (
    <MainLayout>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: 3,
          minWidth: '300px',
          flexWrap: 'wrap',
        }}
      >
        {' '}
        <Box>
          <Button
            variant={conceptTracking ? 'contained' : 'outlined'}
            onClick={toggleConceptTrackingMode}
            sx={{
              m: '10px 10px 10px 0',
            }}
          >
            {conceptTracking ? 'Disable Tracking' : 'Enable Tracking'}
          </Button>
          <Typography variant="body1" sx={{ color: 'text.secondary', p: 0.5 }}>
            Concept Position Tracking is {conceptTracking ? 'Enabled' : 'Disabled'}
            <br />
            Your device id is <b>{storedDeviceId || 'not set'}</b>
          </Typography>
        </Box>
        <Card
          sx={{
            width: '100%',
            maxWidth: '600px',
            boxShadow: 3,
            borderRadius: '12px',
            backgroundColor: 'white',
          }}
        >
          <CardHeader
            title="Concepts Position Info"
            sx={{
              textAlign: 'center',
              backgroundColor: 'primary.10',
              color: 'white',
              borderRadius: '12px 12px 0 0',
              padding: 2,
            }}
          />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  Select Device ID
                </Typography>
                {loadingDeviceId ? (
                  <CircularProgress size={24} />
                ) : (
                  <Select
                    fullWidth
                    value={selectedDeviceId || ''}
                    onChange={(e) => handleDeviceIdSelect(e.target.value)}
                    sx={{
                      backgroundColor: 'background.paper',
                      borderRadius: '8px',
                    }}
                  >
                    {deviceIds.map((folder) => (
                      <MenuItem key={folder} value={folder}>
                        {folder}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              </Box>

              {selectedDeviceId && (
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Select Recording ID
                  </Typography>
                  {loadingRecordingId ? (
                    <CircularProgress size={24} />
                  ) : (
                    <Select
                      fullWidth
                      value={selectedRecordingId || ''}
                      onChange={(e) => handleRecordingIdSelect(e.target.value)}
                      sx={{
                        backgroundColor: 'background.paper',
                        borderRadius: '8px',
                      }}
                    >
                      {recordingIds.map((file) => (
                        <MenuItem key={file} value={file}>
                          {file}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                </Box>
              )}
              {loadingFileContent ? (
                <CircularProgress size={24} />
              ) : (
                fileContent && (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ marginBottom: 1 }}>
                      File Content
                    </Typography>
                    <Tooltip title={copySuccess ? 'Copied!' : 'Copy'}>
                      <IconButton
                        onClick={handleCopyToClipboard}
                        sx={{
                          position: 'absolute',
                          zIndex: 1,
                          top: 50,
                          right: 5,
                          color: copySuccess ? 'green' : 'black',
                          transition: 'color 0.3s',
                          '&:hover': {
                            color: 'blue',
                          },
                        }}
                      >
                        <ContentCopy />
                      </IconButton>
                    </Tooltip>

                    <Box
                      sx={{
                        padding: 2,
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        backgroundColor: '#fafafa',
                        minHeight: '100px',
                        maxHeight: '50vh',
                        overflow: 'auto',
                        wordBreak: 'break-word',
                      }}
                    >
                      <Typography variant="body2">{fileContent}</Typography>
                    </Box>
                  </Box>
                )
              )}
            </Box>
          </CardContent>
        </Card>
        <Box></Box>
      </Box>
    </MainLayout>
  );
};

export default PositionDataSelector;
