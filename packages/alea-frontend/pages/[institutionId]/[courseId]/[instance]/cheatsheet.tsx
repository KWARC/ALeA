import {
  Box,
  Button,
  CircularProgress,
  Chip,
  Tooltip,
  Typography,
  Alert,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useCurrentUser } from '@alea/react-utils';
import { useRouteValidation } from '../../../../hooks/useRouteValidation';
import { RouteErrorDisplay } from '../../../../components/RouteErrorDisplay';
import { CourseNotFound } from '../../../../components/CourseNotFound';
import { CourseHeader } from '../../../../components/CourseHeader';
import MainLayout from '../../../../layouts/MainLayout';
import {
  createCheatSheet,
  deleteCheatSheet,
  getAllCourses,
  getCheatSheets,
  getCheatsheetUploadWindow,
  getStudentsEnrolledInCourse,
  CheatSheet,
  CheatsheetUploadWindowResponse,
} from '@alea/spec';
import { UploadCheatSheet } from '../../../../components/UploadCheatSheet';
import { PostAdd, DeleteOutline } from '@mui/icons-material';
import {
  CheatSheetWindowsTable,
  EmptyState,
  FilePreviewDialog,
  InlineStudentMergeButton,
  UserFilterBar,
} from '../../../../components/CheatSheetComponents';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';

interface CheatSheetActionsProps {
  isEmbedded: boolean;
  onDownload: () => void;
  onUpload: () => void;
  uploadWindowInfo?: CheatsheetUploadWindowResponse | null;
}

function CheatSheetActions({
  isEmbedded,
  onDownload,
  onUpload,
  uploadWindowInfo,
}: CheatSheetActionsProps) {
  const getUploadButtonState = () => {
    if (isEmbedded) {
      return {
        disabled: false,
        tooltip: 'Upload cheatsheet.',
      };
    }

    if (!uploadWindowInfo?.hasUploadEnabled) {
      return {
        disabled: true,
        tooltip: uploadWindowInfo?.message || 'Cheatsheet upload is not available',
      };
    }

    if (uploadWindowInfo.currentWindow) {
      return {
        disabled: false,
        tooltip: `Current Week Cheatsheet upload available until ${new Date(
          uploadWindowInfo.currentWindow.windowEnd
        ).toLocaleString()}`,
      };
    }

    if (uploadWindowInfo.upcomingWindow) {
      const startDate = new Date(uploadWindowInfo.upcomingWindow.windowStart).toLocaleString();
      return {
        disabled: true,
        tooltip: `Next upload window: ${startDate}`,
      };
    }

    return {
      disabled: true,
      tooltip: 'No upload windows available',
    };
  };

  const uploadState = getUploadButtonState();
  return (
    <Box display="flex" justifyContent="end" gap={2} alignItems="flex-start">
      {!isEmbedded && (
        <Tooltip title="Download Blank CheatSheet">
          <Button
            variant="contained"
            size="small"
            startIcon={<PostAdd />}
            onClick={onDownload}
            sx={pageStyles.uploadBtn}
          >
            Download
          </Button>
        </Tooltip>
      )}
      {(isEmbedded || uploadWindowInfo?.hasUploadEnabled) && (
        <Tooltip title={uploadState.tooltip}>
          <span>
            <Button
              variant="contained"
              size="small"
              startIcon={<UploadFileIcon />}
              onClick={onUpload}
              disabled={uploadState.disabled}
              sx={pageStyles.uploadBtn}
            >
              Upload
            </Button>
          </span>
        </Tooltip>
      )}
    </Box>
  );
}

function InstructorCheatsheetStats({
  files,
  uploadWindowInfo,
  enrolledStudents,
}: {
  files: CheatSheet[];
  uploadWindowInfo?: CheatsheetUploadWindowResponse | null;
  enrolledStudents: string[];
}) {
  const weeklyStats = useMemo(() => {
    const uploadedByWeek = new Map<string, Set<string>>();
    files.forEach((file) => {
      if (!uploadedByWeek.has(file.weekId)) {
        uploadedByWeek.set(file.weekId, new Set());
      }
      uploadedByWeek.get(file.weekId)?.add(file.userId);
    });

    return (uploadWindowInfo?.allWindows ?? [])
      .filter((window) => !window.isSkipped)
      .map((window) => {
        const weekId = window.windowStart.split('T')[0];
        const uploaded = uploadedByWeek.get(weekId)?.size ?? 0;
        const isCurrent = window.isWithinWindow;
        return {
          weekId,
          uploaded,
          isCurrent,
          windowStart: window.windowStart,
          windowEnd: window.windowEnd,
        };
      });
  }, [files, uploadWindowInfo]);

  const defaultWeekId =
    weeklyStats.find((stat) => stat.isCurrent)?.weekId ??
    [...weeklyStats].reverse().find((stat) => stat.uploaded > 0)?.weekId ??
    weeklyStats[0]?.weekId ??
    null;
  const selectedWeekStat = weeklyStats.find((stat) => stat.weekId === defaultWeekId);

  if (weeklyStats.length === 0) {
    return (
      <Box sx={statsStyles.card}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Cheatsheet Upload Stats
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          No upload windows are configured for this course instance yet.
        </Alert>
      </Box>
    );
  }

  if (!selectedWeekStat) return null;

  const selectedWeekLabel = new Date(selectedWeekStat.weekId).toLocaleDateString();
  const selectedWeekProgress =
    enrolledStudents.length > 0
      ? Math.round((selectedWeekStat.uploaded / enrolledStudents.length) * 100)
      : null;

  return (
    <Box sx={statsStyles.card}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Cheatsheet Upload Stats
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track submissions for the current week.
          </Typography>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mt: 2 }}>
        <strong>Current week:</strong>{' '}
        {selectedWeekLabel} - {selectedWeekStat.uploaded} student
        {selectedWeekStat.uploaded !== 1 ? 's have' : ' has'} uploaded out of{' '}
        {enrolledStudents.length}.
        {selectedWeekProgress !== null ? ` (${selectedWeekProgress}% complete)` : ''}
      </Alert>

      <Box sx={{ mt: 2, display: 'grid', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Upload window: {new Date(selectedWeekStat.windowStart).toLocaleString()} -{' '}
          {new Date(selectedWeekStat.windowEnd).toLocaleString()}
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Weekly Submission Summary
        </Typography>
        <Box sx={statsStyles.weeklySummaryList}>
          {weeklyStats.map((stat) => {
            return (
              <Box key={stat.weekId} sx={statsStyles.weeklySummaryItem}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {new Date(stat.weekId).toLocaleDateString()}
                    {stat.isCurrent ? ' (Current)' : ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stat.uploaded}/{enrolledStudents.length} submitted
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
export function CheatsheetDownloadDialog({
  open,
  onClose,
  scope,
  onScopeChange,
  onDownload,
  isDownloading = false,
}: {
  open: boolean;
  onClose: () => void;
  scope: 'this-week' | 'semester';
  onScopeChange: (value: 'this-week' | 'semester') => void;
  onDownload: () => void;
  isDownloading?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Download Cheatsheets</DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Download blank cheatsheet and write it in your own handwriting.{' '}
        </Alert>

        <Typography variant="subtitle2" fontWeight="bold" mb={2}>
          Choose what you want
        </Typography>

        <RadioGroup
          value={scope}
          onChange={(e) => onScopeChange(e.target.value as 'this-week' | 'semester')}
          sx={{ mb: 3 }}
        >
          <FormControlLabel value="this-week" control={<Radio />} label="Current week only" />
          <FormControlLabel value="semester" control={<Radio />} label="Entire semester" />
        </RadioGroup>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>

        <Button onClick={onDownload} variant="contained" disabled={isDownloading}>
          {isDownloading ? 'Downloading...' : 'Download'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  isDeleting = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Cheatsheet</DialogTitle>
      <DialogContent sx={{ mt: 1 }}>
        <Alert severity="warning" sx={{ mb: 1 }}>
          This action cannot be undone. The cheatsheet file will be permanently removed.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Are you sure you want to delete this cheatsheet?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          disabled={isDeleting}
          startIcon={<DeleteOutline />}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CheatSheetsContent({
  files,
  statsFiles,
  isLoading,
  isError,
  isEmbedded,
  uniqueUserIds,
  selectedUserId,
  onUserIdChange,
  previewFile,
  onPreview,
  onClosePreview,
  instanceId,
  courseId,
  courseName,
  universityId,
  userId,
  uploadWindowInfo,
  enrolledStudents,
}: {
  files: CheatSheet[];
  statsFiles: CheatSheet[];
  isLoading: boolean;
  isError: boolean;
  isEmbedded: boolean;
  uniqueUserIds: string[];
  selectedUserId: string | null;
  onUserIdChange: (id: string | null) => void;
  previewFile: CheatSheet | null;
  onPreview: (file: CheatSheet) => void;
  onClosePreview: () => void;
  instanceId: string;
  courseId: string;
  courseName: string;
  universityId: string;
  userId: string;
  uploadWindowInfo?: CheatsheetUploadWindowResponse | null;
  enrolledStudents: string[];
}) {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [bulkDownloadOpen, setBulkDownloadOpen] = useState(false);
  const [downloadScope, setDownloadScope] = useState<'this-week' | 'semester'>('this-week');
  const [isDownloading, setIsGenerating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CheatSheet | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (file: CheatSheet) => deleteCheatSheet({ cheatsheetId: String(file.cheatsheetId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheatsheets', courseId, instanceId] });
      setDeleteTarget(null);
    },
  });
  function handleUploaded() {
    queryClient.invalidateQueries({
      queryKey: ['cheatsheets', courseId, instanceId],
    });
  }

  type CheatsheetScope = 'WEEK' | 'SEMESTER';
  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      const scope: CheatsheetScope = downloadScope === 'this-week' ? 'WEEK' : 'SEMESTER';
      await downloadCheatsheet(scope);
    } catch (err) {
      console.error('Error generating cheatsheet:', err);
    } finally {
      setIsGenerating(false);
    }
  };
  const downloadCheatsheet = async (scope: CheatsheetScope) => {
    const { blob, filename } = await createCheatSheet({
      courseName,
      courseId,
      instanceId,
      universityId,
      scope,
    });
    const safeBlob = blob instanceof Blob ? blob : new Blob([blob], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(safeBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename ?? 'cheatsheet.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box sx={pageStyles.container}>
      {isEmbedded && (
        <InstructorCheatsheetStats
          files={statsFiles}
          uploadWindowInfo={uploadWindowInfo}
          enrolledStudents={enrolledStudents}
        />
      )}

      {!isEmbedded && uploadWindowInfo && !uploadWindowInfo.currentWindow && (
        <Alert severity={uploadWindowInfo.hasUploadEnabled ? 'info' : 'warning'} sx={{ mb: 2 }}>
          {uploadWindowInfo.upcomingWindow
            ? `Next upload window: ${new Date(
                uploadWindowInfo.upcomingWindow.windowStart
              ).toLocaleDateString()} ${new Date(
                uploadWindowInfo.upcomingWindow.windowStart
              ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
            : uploadWindowInfo.message || 'No upload windows available'}
        </Alert>
      )}

      <CheatSheetActions
        isEmbedded={isEmbedded}
        onDownload={() => setBulkDownloadOpen(true)}
        onUpload={() => setUploadOpen(true)}
        uploadWindowInfo={uploadWindowInfo}
      />
      <CheatsheetDownloadDialog
        open={bulkDownloadOpen}
        onClose={() => setBulkDownloadOpen(false)}
        scope={downloadScope}
        onScopeChange={setDownloadScope}
        onDownload={handleDownload}
        isDownloading={isDownloading}
      />

      <Box sx={pageStyles.titleBar}>
        <Box sx={pageStyles.titleLeft}>
          <Box sx={pageStyles.titleIconWrap}>
            <FolderOpenIcon sx={pageStyles.titleIcon} />
          </Box>
          <Box>
            <Typography variant="h5" sx={pageStyles.heading}>
              {isEmbedded ? 'Student CheatSheets' : 'CheatSheets'}
            </Typography>
            <Typography variant="body2" sx={pageStyles.subheading}>
              {isEmbedded
                ? 'Browse all cheat sheets uploaded for this course instance'
                : 'All your uploaded cheat sheet files in one place'}
            </Typography>
          </Box>
        </Box>
        <Box display={'flex'} gap={2}>
          <Box sx={pageStyles.titleRight}>
            {!isLoading && files.length > 0 && (!isEmbedded || selectedUserId) && (
              <Chip
                label={`${files.length} file${files.length !== 1 ? 's' : ''}`}
                color="primary"
                size="small"
                sx={pageStyles.countChip}
              />
            )}
          </Box>
          {!isEmbedded && userId && (
            <InlineStudentMergeButton
              courseId={courseId}
              instanceId={instanceId}
              universityId={universityId}
              userId={userId}
            />
          )}
        </Box>
      </Box>

      {isEmbedded && uniqueUserIds.length > 0 && (
        <UserFilterBar
          universityId={universityId}
          userIds={uniqueUserIds}
          selectedUserId={selectedUserId}
          onChange={onUserIdChange}
          mergeProps={{ courseId, instanceId, courseName, universityId }}
        />
      )}

      <Box sx={pageStyles.divider} />

      {isLoading && (
        <Box sx={pageStyles.centered}>
          <CircularProgress size={36} thickness={4} />
        </Box>
      )}

      {isError && (
        <Box sx={pageStyles.centered}>
          <Typography variant="body1" color="error.main">
            Failed to load cheat sheets. Please try again later.
          </Typography>
        </Box>
      )}

      {isEmbedded && !selectedUserId && !isLoading && !isError && (
        <EmptyState
          title="Select a student"
          subtitle="Choose a student from the dropdown above to view their cheat sheets."
        />
      )}

      {isEmbedded && selectedUserId && !isLoading && !isError && files.length === 0 && (
        <EmptyState
          title="No cheat sheets found"
          subtitle="This student hasn't generated any cheat sheets for this course instance."
        />
      )}

      {!isEmbedded && !isLoading && !isError && files.length === 0 && (
        <EmptyState
          title="No cheat sheets found"
          subtitle="Cheat sheets you generate during quizzes will appear here."
        />
      )}

      {!isLoading && !isError && files.length > 0 && (
        <Box sx={pageStyles.list}>
          {uploadWindowInfo?.allWindows && (
            <CheatSheetWindowsTable
              windows={uploadWindowInfo.allWindows}
              files={files}
              onPreview={onPreview}
              onDelete={setDeleteTarget}
            />
          )}
        </Box>
      )}

      <FilePreviewDialog file={previewFile} open={Boolean(previewFile)} onClose={onClosePreview} />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        isDeleting={deleteMutation.isPending}
      />

      <UploadCheatSheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={handleUploaded}
        instanceId={instanceId}
        courseId={courseId}
        universityId={universityId}
        userId={userId}
        isInstructor={isEmbedded}
      />
    </Box>
  );
}

async function fetchCheatsheets(
  courseId: string,
  instanceId: string,
  userId?: string
): Promise<CheatSheet[]> {
  const data = await getCheatSheets(courseId, instanceId, userId);
  return data;
}

const CheatsheetsPage = ({
  courseId: propCourseId,
  instanceId: propInstanceId,
  courseName: propCourseName,
}: {
  courseId: string;
  instanceId: string;
  courseName?: string;
}) => {
  const isEmbedded = Boolean(propCourseId && propInstanceId);
  const {
    institutionId,
    courseId: routeCourseId,
    instance,
    resolvedInstanceId: routeInstanceId,
    validationError,
    isValidating,
  } = useRouteValidation(isEmbedded ? null : '');
  const courseId = propCourseId ?? routeCourseId ?? '';
  const instanceId = propInstanceId ?? routeInstanceId ?? '';
  const { user } = useCurrentUser();
  const userId = user?.userId ?? '';
  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => getAllCourses(),
    enabled: !isEmbedded,
  });

  const { data: uploadWindowInfo } = useQuery({
    queryKey: ['cheatsheet-upload-window', courseId, instanceId, institutionId],
    queryFn: () => getCheatsheetUploadWindow(courseId, instanceId, institutionId),
    enabled: Boolean(courseId && instanceId && institutionId),
  });

  const { data: enrolledStudents } = useQuery({
    queryKey: ['cheatsheet-enrolled-students', courseId, instanceId],
    queryFn: () => getStudentsEnrolledInCourse(courseId, instanceId),
    enabled: Boolean(courseId && instanceId && isEmbedded),
  });

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const {
    data: allFiles = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['cheatsheets', courseId, instanceId, isEmbedded ? 'instructor' : 'student'],
    enabled: Boolean(instanceId) && Boolean(courseId),
    queryFn: () => fetchCheatsheets(courseId, instanceId),
  });
  const uniqueUserIds = useMemo(
    () => [...new Set(allFiles.map((f) => f.userId))].sort(),
    [allFiles]
  );
  const visibleFiles = useMemo(() => {
    if (!isEmbedded) return allFiles;
    if (!selectedUserId) return [];
    return allFiles.filter((f) => f.userId === selectedUserId);
  }, [allFiles, isEmbedded, selectedUserId]);

  const [previewFile, setPreviewFile] = useState<CheatSheet | null>(null);

  const sharedContentProps = {
    files: visibleFiles,
    statsFiles: allFiles,
    isLoading,
    isError,
    uniqueUserIds,
    selectedUserId,
    onUserIdChange: setSelectedUserId,
    previewFile,
    onPreview: setPreviewFile,
    onClosePreview: () => setPreviewFile(null),
    instanceId,
    courseId,
    courseName: propCourseName ?? '',
    userId,
    uploadWindowInfo,
    enrolledStudents: Array.isArray(enrolledStudents) ? enrolledStudents : [],
  };

  if (!isEmbedded) {
    if (isValidating) return null;
    if (validationError) {
      return (
        <RouteErrorDisplay
          validationError={validationError}
          institutionId={institutionId}
          courseId={courseId}
          instance={instance}
        />
      );
    }
    if (!institutionId || !courseId || !instanceId) return <CourseNotFound />;
    const courseInfo = (courses as Record<string, { courseName: string; imageLink: string }>)[
      courseId
    ];
    if (!courseInfo) return <CourseNotFound />;
    return (
      <MainLayout title={`${courseId.toUpperCase()} · CheatSheets | ALeA`}>
        <CourseHeader
          courseName={courseInfo.courseName}
          imageLink={courseInfo.imageLink}
          courseId={courseId}
          institutionId={institutionId}
          instanceId={instanceId}
        />
        <CheatSheetsContent
          {...sharedContentProps}
          isEmbedded={false}
          universityId={institutionId ?? ''}
          courseName={courseInfo.courseName}
        />
      </MainLayout>
    );
  }

  return (
    <CheatSheetsContent {...sharedContentProps} isEmbedded universityId={institutionId ?? ''} />
  );
};

export default CheatsheetsPage;

const pageStyles = {
  container: {
    maxWidth: 960,
    mx: 'auto',
    px: 3,
    py: 4,
  },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    mb: 2,
    flexWrap: 'wrap',
    gap: 1.5,
  },
  titleLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  titleRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
  },
  titleIconWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 2,
    bgcolor: 'primary.main',
    boxShadow: 3,
    flexShrink: 0,
  },
  titleIcon: {
    color: 'primary.contrastText',
    fontSize: 26,
  },
  heading: {
    fontWeight: 700,
    color: 'text.primary',
    lineHeight: 1.2,
  },
  subheading: {
    color: 'text.secondary',
    mt: 0.25,
  },
  countChip: {
    fontWeight: 600,
    px: 0.5,
  },
  uploadBtn: {
    fontWeight: 600,
    textTransform: 'none',
    borderRadius: 2,
  },
  divider: {
    height: '1px',
    bgcolor: 'divider',
    mb: 2,
  },
  centered: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    py: 10,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5,
  },
};

const statsStyles = {
  card: {
    mb: 2,
    p: 2,
    borderRadius: 2,
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: 'divider',
    boxShadow: 1,
  },
  weeklySummaryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    maxHeight: 210,
    overflowY: 'auto',
    pr: 1,
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 2,
    p: 1,
    bgcolor: 'background.default',
    alignContent: 'start',
  },
  weeklySummaryItem: {
    px: 1.25,
    py: 0.9,
    borderRadius: 1.5,
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: 'divider',
    width: '100%',
  },
};
