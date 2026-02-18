import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import FilterListIcon from '@mui/icons-material/FilterList';
import SchoolIcon from '@mui/icons-material/School';
import MainLayout from '../../layouts/MainLayout';
import { UnmatchedSegments } from '../../components/UnmatchedSegments';
import { getVideoMatchingData, MatchReportData, VideoData } from '@alea/spec';

interface VideoWithMetadata extends VideoData {
  videoId: string;
  subject: string;
  semester: string;
}

const VideoMatchingDashboard = () => {
  const [selectedCourseOverride, setSelectedCourseOverride] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedVideo, setExpandedVideo] = useState<string | false>(false);
  const [videoSegmentFilters, setVideoSegmentFilters] = useState<{
    [key: string]: 'all' | 'matched' | 'unmatched';
  }>({});
  const itemsPerPage = 10;

  const {
    data: matchReportData,
    isLoading,
    isError,
  } = useQuery<MatchReportData>({
    queryKey: ['videoMatchingData'],
    queryFn: async () => {
      const data = await getVideoMatchingData();
      if (!data) {
        throw new Error('Failed to fetch video matching data');
      }
      return data;
    },
  });

  const courses = matchReportData ? Object.keys(matchReportData) : [];
  const selectedCourse = selectedCourseOverride ?? courses[0] ?? '';
  const setSelectedCourse = setSelectedCourseOverride;
  const videos = useMemo((): VideoWithMetadata[] => {
    if (!matchReportData || !selectedCourse) return [];
    const courseData = matchReportData[selectedCourse];
    if (!courseData) return [];
    return Object.entries(courseData.videos).map(([videoId, videoData]) => ({
      videoId,
      ...(videoData as object),
      subject: courseData.subject,
      semester: courseData.semester,
    })) as VideoWithMetadata[];
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

  const handleVideoSegmentFilterChange = (
    videoId: string,
    filter: 'all' | 'matched' | 'unmatched'
  ) => {
    setVideoSegmentFilters((prev) => ({
      ...prev,
      [videoId]: filter,
    }));
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

  if (isLoading || isError || !matchReportData) {
    const isFailure = !isLoading && (isError || !matchReportData);
    return (
      <Container maxWidth="lg" sx={videoMatchingStyles.container}>
        <Box sx={videoMatchingStyles.loadingBox}>
          <Typography variant="h6" color={isFailure ? 'error' : undefined}>
            {isLoading
              ? 'Loading video match report data...'
              : 'Failed to load match report data. Please try again.'}
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="lg" sx={videoMatchingStyles.container}>
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

        <Paper sx={videoMatchingStyles.courseSection}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SchoolIcon color="primary" />
            <Typography variant="h6" sx={videoMatchingStyles.sectionTitle}>
              Select Course
            </Typography>
          </Box>

          <FormControl fullWidth>
            <InputLabel id="course-select-label">Course</InputLabel>
            <Select
              labelId="course-select-label"
              value={selectedCourse}
              label="Course"
              onChange={(e) => handleCourseChange(e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <FilterListIcon />
                </InputAdornment>
              }
            >
              {courses.map((courseKey) => {
                const courseData = matchReportData[courseKey];
                return (
                  <MenuItem key={courseKey} value={courseKey}>
                    {courseData.subject} - {courseData.semester}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Paper>

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
                const currentFilter = videoSegmentFilters[video.videoId] || 'all';
                const showMatched = currentFilter === 'all' || currentFilter === 'matched';
                const showUnmatched = currentFilter === 'all' || currentFilter === 'unmatched';

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
                        <Typography variant="body1" sx={videoMatchingStyles.videoIdText}>
                          {video.videoId}
                        </Typography>

                        <Box sx={videoMatchingStyles.accordionStats}>
                          <Chip
                            icon={<CheckCircleIcon />}
                            label={`Matched: ${matchedCount}`}
                            color="success"
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            icon={<CancelIcon />}
                            label={`Unmatched: ${unmatchedCount}`}
                            color="error"
                            size="small"
                            variant="outlined"
                          />
                          <Typography variant="body2" sx={videoMatchingStyles.matchPercentText}>
                            {matchPercent.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                    </AccordionSummary>

                    <AccordionDetails sx={videoMatchingStyles.accordionDetails}>
                      <Box sx={{ mb: 3 }}>
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                          <InputLabel id={`filter-${video.videoId}`}>Filter Segments</InputLabel>
                          <Select
                            labelId={`filter-${video.videoId}`}
                            value={currentFilter}
                            label="Filter Segments"
                            onChange={(e) =>
                              handleVideoSegmentFilterChange(
                                video.videoId,
                                e.target.value as 'all' | 'matched' | 'unmatched'
                              )
                            }
                            startAdornment={
                              <InputAdornment position="start">
                                <FilterListIcon fontSize="small" />
                              </InputAdornment>
                            }
                          >
                            <MenuItem value="all">All Segments</MenuItem>
                            <MenuItem value="matched">
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckCircleIcon fontSize="small" color="success" />
                                Matched Only
                              </Box>
                            </MenuItem>
                            <MenuItem value="unmatched">
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CancelIcon fontSize="small" color="error" />
                                Unmatched Only
                              </Box>
                            </MenuItem>
                          </Select>
                        </FormControl>
                      </Box>

                      {showMatched && video.matched && video.matched.length > 0 && (
                        <Box sx={videoMatchingStyles.segmentSection}>
                          <Box sx={videoMatchingStyles.segmentHeader}>
                            <CheckCircleIcon color="success" />
                            <Typography variant="h6">Matched Segments ({matchedCount})</Typography>
                          </Box>

                          <TableContainer sx={videoMatchingStyles.tableContainer}>
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
                                    Section
                                  </TableCell>
                                  <TableCell sx={videoMatchingStyles.tableHeaderCell}>
                                    Slide Content
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
                                        {match.ocr_text}
                                      </Typography>
                                    </TableCell>

                                    <TableCell>
                                      <Typography
                                        variant="body2"
                                        sx={videoMatchingStyles.sectionTitleText}
                                      >
                                        {match.slide_matched.sectionTitle}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        ID: {match.slide_matched.sectionId}
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
                      {showUnmatched && video.unmatched && video.unmatched.length > 0 && (
                        <Box sx={videoMatchingStyles.segmentSection}>
                          <Box sx={videoMatchingStyles.segmentHeader}>
                            <CancelIcon color="error" />
                            <Typography variant="h6">
                              Unmatched Segments ({unmatchedCount})
                            </Typography>
                          </Box>

                          <UnmatchedSegments
                            segments={video.unmatched}
                            clipId={video.videoId}
                            onSegmentSelect={(segment) => {
                              console.log('Selected segment:', segment);
                            }}
                          />
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
