import {
  Box,
  Button,
  CircularProgress,
  Chip,
  Tooltip,
  Typography,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useCurrentUser } from '@alea/react-utils';
import { useRouteValidation } from '../../../../hooks/useRouteValidation';
import { RouteErrorDisplay } from '../../../../components/RouteErrorDisplay';
import { CourseNotFound } from '../../../../components/CourseNotFound';
import { CourseHeader } from '../../../../components/CourseHeader';
import MainLayout from '../../../../layouts/MainLayout';
import { createCheatSheet, getAllCourses, getCheatSheets } from '@alea/spec';
import type { NextPage } from 'next';
import { UploadCheatSheet } from '../../../../components/UploadCheatSheet';
import { PostAdd } from '@mui/icons-material';
import { CheatSheetRow, DateRangeValue, EmptyState, FilePreviewDialog, InstructorDateRangeFields, UserFilterBar } from '../../../../components/CheatSheetComponents';

interface CheatSheetActionsProps {
  isEmbedded: boolean;
  onGenerate: () => void;
  onUpload: () => void;
}

function CheatSheetActions({ isEmbedded, onGenerate, onUpload }: CheatSheetActionsProps) {
  return (
    <Box display="flex" justifyContent="end" gap={2}>
      {!isEmbedded && (
        <Tooltip title="Generate Empty CheatSheet">
          <Button
            variant="contained"
            size="small"
            startIcon={<PostAdd />}
            onClick={onGenerate}
            sx={pageStyles.uploadBtn}
          >
            Generate
          </Button>
        </Tooltip>
      )}
      <Tooltip title="Upload Scanned PDF">
        <Button
          variant="contained"
          size="small"
          startIcon={<UploadFileIcon />}
          onClick={onUpload}
          sx={pageStyles.uploadBtn}
        >
          Upload
        </Button>
      </Tooltip>
    </Box>
  );
}

function CheatSheetsContent({
  files,
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
}: {
  files: any[];
  isLoading: boolean;
  isError: boolean;
  isEmbedded: boolean;
  uniqueUserIds: string[];
  selectedUserId: string | null;
  onUserIdChange: (id: string | null) => void;
  previewFile: any | null;
  onPreview: (file: any) => void;
  onClosePreview: () => void;
  instanceId: string;
  courseId: string;
  courseName: string;
  universityId: string;
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [generationWindow, setGenerationWindow] = useState<DateRangeValue>({ start: '', end: '' });
  const [uploadWindow, setUploadWindow] = useState<DateRangeValue>({ start: '', end: '' });

  function handleUploaded() {
    queryClient.invalidateQueries({ queryKey: ['cheatsheets', instanceId] });
  }

  const downloadCheatsheet = async () => {
    const { blob, filename } = await createCheatSheet({
      courseName,
      courseId,
      instanceId,
      universityId,
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
      <CheatSheetActions
        isEmbedded={isEmbedded}
        onGenerate={downloadCheatsheet}
        onUpload={() => setUploadOpen(true)}
      />
{/* 
      {isEmbedded && (
        <InstructorDateRangeFields
          generationWindow={generationWindow}
          uploadWindow={uploadWindow}
          onGenerationWindowChange={setGenerationWindow}
          onUploadWindowChange={setUploadWindow}
        />
      )} */}

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
                ? 'Browse all cheat sheets generated for this course instance'
                : 'All your generated cheat sheet files in one place'}
            </Typography>
          </Box>
        </Box>

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
      </Box>

      {isEmbedded && uniqueUserIds.length > 0 && (
        <UserFilterBar
          userIds={uniqueUserIds}
          selectedUserId={selectedUserId}
          onChange={onUserIdChange}
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
          {files.map((file) => (
            <CheatSheetRow
              key={file.cheatsheetId}
              file={file}
              onPreview={onPreview}
              showUserId={false}
            />
          ))}
        </Box>
      )}

      <FilePreviewDialog file={previewFile} open={Boolean(previewFile)} onClose={onClosePreview} />

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchCheatsheets(
  courseId: string,
  instanceId: string,
  userId?: string
): Promise<any[]> {
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
  const router = useRouter();
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
  const {
    data: allFiles = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['cheatsheets', instanceId, isEmbedded ? 'all' : userId],
    enabled: Boolean(instanceId) && (isEmbedded || Boolean(userId)),
    queryFn: () => fetchCheatsheets(courseId, instanceId, isEmbedded ? undefined : userId),
  });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const uniqueUserIds = useMemo(
    () => [...new Set(allFiles.map((f) => f.userId))].sort(),
    [allFiles]
  );
  const visibleFiles = useMemo(() => {
    if (!isEmbedded) return allFiles;
    if (!selectedUserId) return [];
    return allFiles.filter((f) => f.userId === selectedUserId);
  }, [allFiles, isEmbedded, selectedUserId]);

  const [previewFile, setPreviewFile] = useState<any | null>(null);

  const sharedContentProps = {
    files: visibleFiles,
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
    const courseInfo = (courses as any)[courseId];
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

  return <CheatSheetsContent {...sharedContentProps} isEmbedded universityId="" />;
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