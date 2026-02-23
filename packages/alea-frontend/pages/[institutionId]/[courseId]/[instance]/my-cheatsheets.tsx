import {
  Autocomplete,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useCurrentUser } from '@alea/react-utils';
import { useRouteValidation } from '../../../../hooks/useRouteValidation';
import { RouteErrorDisplay } from '../../../../components/RouteErrorDisplay';
import { CourseNotFound } from '../../../../components/CourseNotFound';
import { CourseHeader } from '../../../../components/CourseHeader';
import MainLayout from '../../../../layouts/MainLayout';
import { getAllCourses } from '@alea/spec';
import type { CheatSheetFile } from '../../../api/get-cheatsheets';
import type { NextPage } from 'next';

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Fetches cheatsheets for a given instance.
 * - Student view: pass `userId` to scope results to that user only.
 * - Instructor view: omit `userId` to retrieve all files for the instance.
 */
async function fetchCheatsheets(instanceId: string, userId?: string): Promise<CheatSheetFile[]> {
  const params = new URLSearchParams({ instanceId });
  if (userId) params.set('userId', userId);
  const res = await fetch(`/api/get-cheatsheets?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch cheatsheets');
  const data = await res.json();
  return data.files as CheatSheetFile[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PdfPreviewDialog({
  file,
  open,
  onClose,
}: {
  file: CheatSheetFile | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!file) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={previewDialogStyles.title}>
        <Box sx={previewDialogStyles.titleInner}>
          <DescriptionIcon fontSize="small" />
          <Typography variant="subtitle1" sx={previewDialogStyles.titleText}>
            {file.filename}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={previewDialogStyles.closeBtn}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={previewDialogStyles.content}>
        <iframe
          src={file.url}
          title={file.filename}
          width="100%"
          height="100%"
          style={{ border: 'none' }}
        />
      </DialogContent>
    </Dialog>
  );
}

function CheatSheetRow({
  file,
  onPreview,
  showUserId,
}: {
  file: CheatSheetFile;
  onPreview: (file: CheatSheetFile) => void;
  showUserId?: boolean;
}) {
  return (
    <Box sx={rowStyles.root}>
      <DescriptionIcon sx={rowStyles.icon} />
      <Box sx={rowStyles.meta}>
        <Typography variant="body2" sx={rowStyles.filename} noWrap>
          {file.filename}
        </Typography>
        {showUserId && (
          <Typography variant="caption" sx={rowStyles.userId}>
            {file.userId}
          </Typography>
        )}
      </Box>
      <Box sx={rowStyles.actions}>
        <Tooltip title="Preview">
          <IconButton size="small" onClick={() => onPreview(file)} sx={rowStyles.iconBtn}>
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Download">
          <IconButton
            size="small"
            component="a"
            href={file.url}
            download={file.filename}
            sx={rowStyles.iconBtn}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Box sx={emptyStateStyles.root}>
      <Box sx={emptyStateStyles.iconWrap}>
        <FolderOpenIcon sx={emptyStateStyles.icon} />
      </Box>
      <Typography variant="h6" sx={emptyStateStyles.title}>
        {title}
      </Typography>
      <Typography variant="body2" sx={emptyStateStyles.subtitle}>
        {subtitle}
      </Typography>
    </Box>
  );
}

// ─── Instructor filter bar ────────────────────────────────────────────────────

function UserFilterBar({
  userIds,
  selectedUserId,
  onChange,
}: {
  userIds: string[];
  selectedUserId: string | null;
  onChange: (userId: string | null) => void;
}) {
  return (
    <Box sx={filterBarStyles.root}>
      <Box sx={filterBarStyles.labelWrap}>
        <FilterListIcon fontSize="small" sx={filterBarStyles.icon} />
        <Typography variant="body2" sx={filterBarStyles.label}>
          Filter by student
        </Typography>
      </Box>
      <Autocomplete<string>
        options={userIds}
        value={selectedUserId}
        onChange={(_, value) => onChange(value)}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="All students"
            size="small"
            sx={filterBarStyles.input}
          />
        )}
        sx={filterBarStyles.autocomplete}
        clearOnEscape
        blurOnSelect
      />
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface MyCheatSheetsPageProps {
  /** When embedded inside instructor-dash, pass courseId + instanceId directly. */
  courseId?: string;
  instanceId?: string;
}

/**
 * Works in two modes:
 *  - **Student** (standalone page): reads route params, fetches only the
 *    current user's files by passing `userId` to the API.
 *  - **Instructor** (embedded in instructor-dash): receives `courseId` and
 *    `instanceId` as props, fetches ALL files for the instance, and shows a
 *    student-filter dropdown so the instructor can narrow down by user.
 */
const MyCheatSheetsPage: NextPage<MyCheatSheetsPageProps> = ({
  courseId: propCourseId,
  instanceId: propInstanceId,
}) => {
  const router = useRouter();
  const isEmbedded = Boolean(propCourseId && propInstanceId);

  // Route validation is only needed for the standalone (student) page.
  const { institutionId, courseId: routeCourseId, instance, resolvedInstanceId: routeInstanceId, validationError, isValidating } =
    useRouteValidation(isEmbedded ? null : '');

  const courseId = propCourseId ?? routeCourseId;
  const instanceId = propInstanceId ?? routeInstanceId;

  const { user } = useCurrentUser();
  const userId = user?.userId;

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => getAllCourses(),
    enabled: !isEmbedded, // instructor-dash already loads courses itself
  });

  // Instructor mode: fetch all files for the instance (no userId filter).
  // Student mode: fetch only the current user's files.
  const {
    data: allFiles = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['cheatsheets', instanceId, isEmbedded ? 'all' : userId],
    enabled: Boolean(instanceId) && (isEmbedded || Boolean(userId)),
    queryFn: () => fetchCheatsheets(instanceId!, isEmbedded ? undefined : userId),
  });

  // Instructor-only: dropdown state for filtering by student userId.
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const uniqueUserIds = useMemo(
    () => [...new Set(allFiles.map((f) => f.userId))].sort(),
    [allFiles]
  );

  const visibleFiles = useMemo(() => {
    if (!isEmbedded) return allFiles;
    if (!selectedUserId) return []; // instructor must pick a student first
    return allFiles.filter((f) => f.userId === selectedUserId);
  }, [allFiles, isEmbedded, selectedUserId]);

  const [previewFile, setPreviewFile] = useState<CheatSheetFile | null>(null);

  // ── Route guards (standalone / student only) ──
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
      <MainLayout title={`${courseId.toUpperCase()} · My Cheat Sheets | ALeA`}>
        <CourseHeader
          courseName={courseInfo.courseName}
          imageLink={courseInfo.imageLink}
          courseId={courseId}
          institutionId={institutionId}
          instanceId={instanceId}
        />
        <CheatSheetsContent
          files={visibleFiles}
          isLoading={isLoading}
          isError={isError}
          isEmbedded={false}
          uniqueUserIds={uniqueUserIds}
          selectedUserId={selectedUserId}
          onUserIdChange={setSelectedUserId}
          previewFile={previewFile}
          onPreview={setPreviewFile}
          onClosePreview={() => setPreviewFile(null)}
        />
      </MainLayout>
    );
  }

  // ── Embedded / instructor view ──
  return (
    <CheatSheetsContent
      files={visibleFiles}
      isLoading={isLoading}
      isError={isError}
      isEmbedded
      uniqueUserIds={uniqueUserIds}
      selectedUserId={selectedUserId}
      onUserIdChange={setSelectedUserId}
      previewFile={previewFile}
      onPreview={setPreviewFile}
      onClosePreview={() => setPreviewFile(null)}
    />
  );
};

export default MyCheatSheetsPage;

// ─── Shared content component ─────────────────────────────────────────────────

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
}: {
  files: CheatSheetFile[];
  isLoading: boolean;
  isError: boolean;
  isEmbedded: boolean;
  uniqueUserIds: string[];
  selectedUserId: string | null;
  onUserIdChange: (id: string | null) => void;
  previewFile: CheatSheetFile | null;
  onPreview: (file: CheatSheetFile) => void;
  onClosePreview: () => void;
}) {
  return (
    <Box sx={pageStyles.container}>
      <Box sx={pageStyles.titleBar}>
        <Box sx={pageStyles.titleLeft}>
          <Box sx={pageStyles.titleIconWrap}>
            <FolderOpenIcon sx={pageStyles.titleIcon} />
          </Box>
          <Box>
            <Typography variant="h5" sx={pageStyles.heading}>
              {isEmbedded ? 'Student Cheat Sheets' : 'My Cheat Sheets'}
            </Typography>
            <Typography variant="body2" sx={pageStyles.subheading}>
              {isEmbedded
                ? 'Browse all cheat sheets generated for this course instance'
                : 'All your generated cheat sheet files in one place'}
            </Typography>
          </Box>
        </Box>
        {!isLoading && files.length > 0 && (!isEmbedded || selectedUserId) && (
          <Chip
            label={`${files.length} file${files.length !== 1 ? 's' : ''}`}
            color="primary"
            size="small"
            sx={pageStyles.countChip}
          />
        )}
      </Box>

      {/* Instructor filter */}
      {isEmbedded && uniqueUserIds.length > 0 && (
        <UserFilterBar
          userIds={uniqueUserIds}
          selectedUserId={selectedUserId}
          onChange={onUserIdChange}
        />
      )}

      <Box sx={pageStyles.divider} />

      {/* States */}
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

      {/* Instructor: prompt to pick a student before showing anything */}
      {isEmbedded && !selectedUserId && !isLoading && !isError && (
        <EmptyState
          title="Select a student"
          subtitle="Choose a student from the dropdown above to view their cheat sheets."
        />
      )}

      {/* Instructor: student selected but has no files */}
      {isEmbedded && selectedUserId && !isLoading && !isError && files.length === 0 && (
        <EmptyState
          title="No cheat sheets found"
          subtitle="This student hasn't generated any cheat sheets for this course instance."
        />
      )}

      {/* Student: no files at all */}
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
              key={file.filename}
              file={file}
              onPreview={onPreview}
              showUserId={false}
            />
          ))}
        </Box>
      )}

      <PdfPreviewDialog file={previewFile} open={Boolean(previewFile)} onClose={onClosePreview} />
    </Box>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

const rowStyles = {
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    px: 2,
    py: 1,
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: 'background.paper',
    transition: 'box-shadow 0.15s ease, background-color 0.15s ease',
    '&:hover': {
      boxShadow: 2,
      bgcolor: 'primary.50',
    },
  },
  icon: {
    color: 'primary.main',
    fontSize: 20,
    flexShrink: 0,
  },
  meta: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 0.25,
  },
  filename: {
    fontFamily: '"Courier Prime", monospace',
    fontWeight: 500,
    color: 'text.primary',
    fontSize: 13,
  },
  userId: {
    color: 'text.secondary',
    fontSize: 11,
  },
  actions: {
    display: 'flex',
    gap: 0.5,
    flexShrink: 0,
  },
  iconBtn: {
    color: 'text.secondary',
    '&:hover': {
      color: 'primary.main',
      bgcolor: 'primary.50',
    },
  },
};

const emptyStateStyles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    py: 12,
    gap: 2,
    borderRadius: 3,
    border: '1px dashed',
    borderColor: 'divider',
    bgcolor: 'background.paper',
  },
  iconWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    borderRadius: '50%',
    bgcolor: 'primary.50',
  },
  icon: {
    fontSize: 36,
    color: 'primary.main',
    opacity: 0.6,
  },
  title: {
    fontWeight: 600,
    color: 'text.primary',
    opacity: 0.75,
  },
  subtitle: {
    color: 'text.secondary',
    opacity: 0.65,
    textAlign: 'center',
    maxWidth: 320,
  },
};

const previewDialogStyles = {
  title: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    py: 1.5,
    px: 2.5,
  },
  titleInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },
  titleText: {
    fontFamily: '"Courier Prime", monospace',
    fontWeight: 600,
  },
  closeBtn: {
    color: 'primary.contrastText',
    '&:hover': { bgcolor: 'primary.600' },
  },
  content: {
    p: 0,
    height: '80vh',
  },
};

const filterBarStyles = {
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    mb: 2,
    p: 1.5,
    borderRadius: 2,
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: 'divider',
  },
  labelWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.75,
    flexShrink: 0,
  },
  icon: {
    color: 'text.secondary',
  },
  label: {
    color: 'text.secondary',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  autocomplete: {
    flex: 1,
    minWidth: 220,
  },
  input: {
    '& .MuiInputBase-root': {
      bgcolor: 'background.default',
    },
  },
};