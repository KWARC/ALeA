import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  Pagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import MainLayout from '../layouts/MainLayout';
import { getVideoMatchingData, MatchReportData, VideoData } from '@alea/spec';
import { get } from 'http';

interface VideoWithMetadata extends VideoData {
  videoId: string;
  subject: string;
  semester: string;
}

const VideoMatchingDashboard = () => {
  const router = useRouter();
  const [matchReportData, setMatchReportData] = useState<MatchReportData | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedVideo, setExpandedVideo] = useState<string | false>(false);
  const itemsPerPage = 10;
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getVideoMatchingData();
        if (!data) {
          throw new Error('Failed to fetch video matching data');
        }
        setMatchReportData(data);

        const firstCourse = Object.keys(data)[0];
        if (firstCourse) {
          setSelectedCourse(firstCourse);
        }
      } catch (error) {
        console.error('Error loading match report data:', error);
      }
    };

    loadData();
  }, []);

  const courses = matchReportData ? Object.keys(matchReportData) : [];
  const videos = useMemo((): VideoWithMetadata[] => {
    if (!matchReportData || !selectedCourse) return [];

    const courseData = matchReportData[selectedCourse];
    if (!courseData) return [];

    return Object.entries(courseData.videos).map(([videoId, videoData]) => ({
      videoId,
      ...videoData,
      subject: courseData.subject,
      semester: courseData.semester,
    }));
  }, [matchReportData, selectedCourse]);

  const filteredVideos = videos.filter(
    (video) =>
      video.videoId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.semester.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage);
  const paginatedVideos = filteredVideos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const statistics = useMemo(() => {
    const totalVideos = videos.length;
    const totalMatched = videos.reduce((sum, v) => sum + (v.stats?.matched || 0), 0);
    const totalUnmatched = videos.reduce((sum, v) => sum + (v.stats?.unmatched || 0), 0);

    const avgMatchPercent =
      totalVideos > 0
        ? videos.reduce((sum, v) => sum + (v.stats?.match_percent || 0), 0) / totalVideos
        : 0;

    return { totalVideos, totalMatched, totalUnmatched, avgMatchPercent };
  }, [videos]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1);
  };

  const handleCourseChange = (courseKey: string) => {
    setSelectedCourse(courseKey);
    setCurrentPage(1);
    setExpandedVideo(false);
  };

  const handleAccordionChange =
    (videoId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedVideo(isExpanded ? videoId : false);
    };

  const handlePageChange = (event: unknown, page: number) => {
    setCurrentPage(page);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const truncateText = (text: string, maxLength: number): string => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Loading state
  if (!matchReportData) {
    return (
      <Container maxWidth="lg" sx={videoMatchingStyles.container}>
        <Box sx={videoMatchingStyles.loadingBox}>
          <Typography variant="h6">Loading match report data...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="lg" sx={videoMatchingStyles.container}>
        {/* Header */}
        <Box sx={videoMatchingStyles.header}>
          <Box sx={videoMatchingStyles.headerContent}>
            <VideoLibraryIcon sx={videoMatchingStyles.headerIcon} />
            <Box>
              <Typography variant="h4" sx={videoMatchingStyles.headerTitle}>
                Video-Slide Matching Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Analyze matched and unmatched video segments across courses
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Course Selection */}
        <Paper sx={videoMatchingStyles.courseSection}>
          <Typography variant="h6" sx={videoMatchingStyles.sectionTitle}>
            Select Course
          </Typography>
          <Box sx={videoMatchingStyles.courseChipsContainer}>
            {courses.map((courseKey) => {
              const courseData = matchReportData[courseKey];
              const isSelected = selectedCourse === courseKey;

              return (
                <Chip
                  key={courseKey}
                  label={`${courseData.subject} - ${courseData.semester}`}
                  onClick={() => handleCourseChange(courseKey)}
                  color={isSelected ? 'primary' : 'default'}
                  sx={videoMatchingStyles.courseChip}
                />
              );
            })}
          </Box>
        </Paper>

        {/* Statistics Cards */}
        <Grid container spacing={2} sx={videoMatchingStyles.statsGrid}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={videoMatchingStyles.statCard}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Videos
                </Typography>
                <Typography variant="h4" sx={videoMatchingStyles.statValue}>
                  {statistics.totalVideos}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={videoMatchingStyles.statCard}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Matched Segments
                </Typography>
                <Typography variant="h4" sx={videoMatchingStyles.statValueSuccess}>
                  {statistics.totalMatched}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={videoMatchingStyles.statCard}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Unmatched Segments
                </Typography>
                <Typography variant="h4" sx={videoMatchingStyles.statValueError}>
                  {statistics.totalUnmatched}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={videoMatchingStyles.statCard}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Avg Match Rate
                </Typography>
                <Typography variant="h4" sx={videoMatchingStyles.statValue}>
                  {statistics.avgMatchPercent.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={videoMatchingStyles.searchSection}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search by video ID"
            value={searchQuery}
            onChange={handleSearch}
            sx={videoMatchingStyles.searchField}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Paper sx={videoMatchingStyles.videosSection}>
          <Box sx={videoMatchingStyles.videosSectionHeader}>
            <Typography variant="h6" sx={videoMatchingStyles.sectionTitle}>
              Videos ({filteredVideos.length})
            </Typography>
          </Box>

          {paginatedVideos.length > 0 ? (
            <Box sx={videoMatchingStyles.accordionsContainer}>
              {paginatedVideos.map((video) => {
                const matchedCount = video.stats?.matched || 0;
                const unmatchedCount = video.stats?.unmatched || 0;
                const matchPercent = video.stats?.match_percent || 0;

                return (
                  <Accordion
                    key={video.videoId}
                    expanded={expandedVideo === video.videoId}
                    onChange={handleAccordionChange(video.videoId)}
                    sx={videoMatchingStyles.accordion}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={videoMatchingStyles.accordionSummary}
                    >
                      <Box sx={videoMatchingStyles.accordionHeader}>
                        <Typography sx={videoMatchingStyles.videoIdText}>
                          Video ID: {video.videoId}
                        </Typography>

                        <Box sx={videoMatchingStyles.accordionStats}>
                          <Chip
                            icon={<CheckCircleIcon />}
                            label={`${matchedCount} matched`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                          <Chip
                            icon={<CancelIcon />}
                            label={`${unmatchedCount} unmatched`}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                          <Typography sx={videoMatchingStyles.matchPercentText}>
                            {matchPercent.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                    </AccordionSummary>

                    <AccordionDetails sx={videoMatchingStyles.accordionDetails}>
                      <Box sx={{ mb: 3 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" color="text.secondary">
                              Subject
                            </Typography>
                            <Typography variant="body1" fontWeight={500}>
                              {video.subject}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" color="text.secondary">
                              Semester
                            </Typography>
                            <Typography variant="body1" fontWeight={500}>
                              {video.semester}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" color="text.secondary">
                              Match Rate
                            </Typography>
                            <Typography variant="body1" fontWeight={500} color="primary.main">
                              {matchPercent.toFixed(1)}%
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>

                      {video.matched && video.matched.length > 0 && (
                        <Box sx={videoMatchingStyles.segmentSection}>
                          <Box sx={videoMatchingStyles.segmentHeader}>
                            <CheckCircleIcon color="success" />
                            <Typography variant="h6">Matched Segments ({matchedCount})</Typography>
                          </Box>

                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={videoMatchingStyles.tableHeaderRow}>
                                  <TableCell sx={videoMatchingStyles.tableHeaderCell}>
                                    Time Range
                                  </TableCell>
                                  <TableCell sx={videoMatchingStyles.tableHeaderCell}>
                                    OCR Text
                                  </TableCell>
                                  <TableCell sx={videoMatchingStyles.tableHeaderCell}>
                                    Matched Slide
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {video.matched.map((match, idx) => (
                                  <TableRow key={idx} sx={videoMatchingStyles.tableRow}>
                                    <TableCell>
                                      <Typography
                                        variant="caption"
                                        sx={videoMatchingStyles.timeText}
                                      >
                                        {formatTime(match.start_time)} -{' '}
                                        {formatTime(match.end_time)}
                                      </Typography>
                                    </TableCell>

                                    <TableCell>
                                      <Typography variant="body2" color="text.secondary">
                                        {truncateText(match.ocr_text, 100)}
                                      </Typography>
                                    </TableCell>

                                    <TableCell>
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mb: 1 }}
                                      >
                                        {truncateText(match.slide_matched.slideContent, 100)}
                                      </Typography>
                                      <Button
                                        size="small"
                                        href={match.slide_matched.slideUri}
                                        target="_blank"
                                        variant="text"
                                      >
                                        View Slide
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}

                      {video.unmatched && video.unmatched.length > 0 && (
                        <Box sx={videoMatchingStyles.segmentSection}>
                          <Box sx={videoMatchingStyles.segmentHeader}>
                            <CancelIcon color="error" />
                            <Typography variant="h6">
                              Unmatched Segments ({unmatchedCount})
                            </Typography>
                          </Box>

                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={videoMatchingStyles.tableHeaderRow}>
                                  <TableCell sx={videoMatchingStyles.tableHeaderCell}>
                                    Time Range
                                  </TableCell>
                                  <TableCell sx={videoMatchingStyles.tableHeaderCell}>
                                    OCR Text
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {video.unmatched.map((unmatch, idx) => (
                                  <TableRow key={idx} sx={videoMatchingStyles.tableRow}>
                                    <TableCell>
                                      <Typography
                                        variant="caption"
                                        sx={videoMatchingStyles.timeText}
                                      >
                                        {formatTime(unmatch.start_time)} -{' '}
                                        {formatTime(unmatch.end_time)}
                                      </Typography>
                                    </TableCell>

                                    <TableCell>
                                      <Typography variant="body2" color="text.secondary">
                                        {unmatch.ocr_text}
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          ) : (
            <Box sx={videoMatchingStyles.emptyState}>
              <Typography variant="body2" color="text.secondary">
                No videos found matching your search criteria.
              </Typography>
            </Box>
          )}

          {totalPages > 1 && (
            <Box sx={videoMatchingStyles.paginationContainer}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </Paper>
      </Container>
    </MainLayout>
  );
};

const videoMatchingStyles = {
  container: {
    py: { xs: 2, sm: 4 },
    px: { xs: 1, sm: 2, md: 3 },
    minHeight: '100vh',
  },
  loadingBox: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  header: {
    mb: { xs: 2, sm: 4 },
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: { xs: 1, sm: 2 },
    flexDirection: { xs: 'column', sm: 'row' },
    textAlign: { xs: 'center', sm: 'left' },
  },
  headerIcon: {
    fontSize: { xs: 32, sm: 40, md: 48 },
    color: 'primary.main',
  },
  headerTitle: {
    fontWeight: 600,
    color: 'text.primary',
    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
  },
  courseSection: {
    mb: 3,
    p: { xs: 1.5, sm: 2 },
    bgcolor: 'background.paper',
  },
  sectionTitle: {
    fontWeight: 600,
    color: 'text.primary',
    mb: 2,
    fontSize: { xs: '1rem', sm: '1.25rem' },
  },
  courseChipsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 1,
    justifyContent: { xs: 'center', sm: 'flex-start' },
  },
  courseChip: {
    cursor: 'pointer',
  },
  statsGrid: {
    mb: 3,
  },
  statCard: {
    bgcolor: 'background.paper',
    transition: 'transform 0.2s',
    '&:hover': {
      transform: 'translateY(-2px)',
    },
  },
  statValue: {
    fontWeight: 700,
    mt: 1,
    fontSize: { xs: '1.75rem', sm: '2.125rem' },
  },
  statValueSuccess: {
    fontWeight: 700,
    mt: 1,
    color: 'success.main',
    fontSize: { xs: '1.75rem', sm: '2.125rem' },
  },
  statValueError: {
    fontWeight: 700,
    mt: 1,
    color: 'error.main',
    fontSize: { xs: '1.75rem', sm: '2.125rem' },
  },
  searchSection: {
    mb: 3,
  },
  searchField: {
    width: '100%',
    maxWidth: { xs: '100%', sm: 600 },
    bgcolor: 'background.paper',
  },
  videosSection: {
    bgcolor: 'background.paper',
    overflow: 'hidden',
  },
  videosSectionHeader: {
    p: { xs: 1.5, sm: 2 },
    borderBottom: 1,
    borderColor: 'divider',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 1,
  },
  accordionsContainer: {
    p: { xs: 1, sm: 2 },
  },
  accordion: {
    mb: 2,
    '&:before': {
      display: 'none',
    },
  },
  accordionSummary: {
    bgcolor: 'action.hover',
    px: { xs: 1, sm: 2 },
    '&:hover': {
      bgcolor: 'action.selected',
    },
  },
  accordionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    pr: { xs: 1, sm: 2 },
    flexWrap: 'wrap',
    gap: 1,
  },
  videoIdText: {
    fontWeight: 600,
    color: 'text.primary',
    fontSize: { xs: '0.9rem', sm: '1rem' },
  },
  accordionStats: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    flexWrap: 'wrap',
  },
  matchPercentText: {
    fontWeight: 600,
    color: 'primary.main',
    ml: 1,
    fontSize: { xs: '0.875rem', sm: '1rem' },
  },
  accordionDetails: {
    bgcolor: 'background.default',
    p: { xs: 1.5, sm: 2, md: 3 },
  },
  segmentSection: {
    mb: 3,
    '&:last-child': {
      mb: 0,
    },
  },
  segmentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    mb: 2,
    flexWrap: 'wrap',
  },
  tableHeaderRow: {
    bgcolor: 'action.hover',
  },
  tableHeaderCell: {
    fontWeight: 600,
    fontSize: { xs: '0.75rem', sm: '0.875rem' },
  },
  tableRow: {
    '&:hover': {
      bgcolor: 'action.hover',
    },
  },
  timeText: {
    fontFamily: 'monospace',
    fontWeight: 600,
    color: 'primary.main',
    fontSize: { xs: '0.75rem', sm: '0.875rem' },
  },
  sectionTitleText: {
    fontWeight: 500,
    mb: 0.5,
    fontSize: { xs: '0.875rem', sm: '1rem' },
  },
  paginationContainer: {
    p: { xs: 1.5, sm: 2 },
    display: 'flex',
    justifyContent: 'center',
    borderTop: 1,
    borderColor: 'divider',
  },
  emptyState: {
    p: { xs: 2, sm: 4 },
    textAlign: 'center',
  },
  tableContainer: {
    overflowX: 'auto',
    '& table': {
      minWidth: { xs: 500, sm: 'auto' },
    },
  },
};

export default VideoMatchingDashboard;
