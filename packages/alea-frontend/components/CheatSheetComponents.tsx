import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemText,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FilterListIcon from '@mui/icons-material/FilterList';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import { useMemo, useState } from 'react';
import { getCheatSheetFile, UploadWindow } from '@alea/spec';
import { toWeekdayIndex, WEEKDAYS } from '@alea/utils';

export interface DateRangeValue {
  start: string;
  end: string;
}

interface InstructorDateRangeFieldsProps {
  generationWindow: DateRangeValue;
  uploadWindow: DateRangeValue;
  onGenerationWindowChange: (value: DateRangeValue) => void;
  onUploadWindowChange: (value: DateRangeValue) => void;
  disabled?: boolean;
}

export function InstructorDateRangeFields({
  generationWindow,
  uploadWindow,
  onGenerationWindowChange,
  onUploadWindowChange,
  disabled = false,
}: InstructorDateRangeFieldsProps) {
  return (
    <Box sx={dateRangeStyles.root}>
      <Box sx={dateRangeStyles.group}>
        <Typography variant="caption" sx={dateRangeStyles.groupLabel}>
          Generation Window
        </Typography>
        <Box sx={dateRangeStyles.fields}>
          <TextField
            label="Generation Start"
            type="datetime-local"
            size="small"
            value={generationWindow.start}
            onChange={(e) =>
              onGenerationWindowChange({ ...generationWindow, start: e.target.value })
            }
            disabled={disabled}
            InputLabelProps={{ shrink: true }}
            sx={dateRangeStyles.field}
          />
          <TextField
            label="Generation End"
            type="datetime-local"
            size="small"
            value={generationWindow.end}
            onChange={(e) => onGenerationWindowChange({ ...generationWindow, end: e.target.value })}
            disabled={disabled}
            InputLabelProps={{ shrink: true }}
            sx={dateRangeStyles.field}
          />
        </Box>
      </Box>

      <Box sx={dateRangeStyles.group}>
        <Typography variant="caption" sx={dateRangeStyles.groupLabel}>
          Upload Window
        </Typography>
        <Box sx={dateRangeStyles.fields}>
          <TextField
            label="Upload Start"
            type="datetime-local"
            size="small"
            value={uploadWindow.start}
            onChange={(e) => onUploadWindowChange({ ...uploadWindow, start: e.target.value })}
            disabled={disabled}
            InputLabelProps={{ shrink: true }}
            sx={dateRangeStyles.field}
          />
          <TextField
            label="Upload End"
            type="datetime-local"
            size="small"
            value={uploadWindow.end}
            onChange={(e) => onUploadWindowChange({ ...uploadWindow, end: e.target.value })}
            disabled={disabled}
            InputLabelProps={{ shrink: true }}
            sx={dateRangeStyles.field}
          />
        </Box>
      </Box>
    </Box>
  );
}

function isImageMime(mime?: string) {
  return typeof mime === 'string' && mime.startsWith('image/');
}

export function FilePreviewDialog({
  file,
  open,
  onClose,
}: {
  file: any | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!file) return null;
  const isImage = isImageMime(file.mimeType);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={previewDialogStyles.title}>
        <Box sx={previewDialogStyles.titleInner}>
          {isImage ? <ImageIcon fontSize="small" /> : <DescriptionIcon fontSize="small" />}
          <Typography variant="subtitle1" sx={previewDialogStyles.titleText}>
            {file.filename}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={previewDialogStyles.closeBtn}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={previewDialogStyles.content}>
        {isImage ? (
          <Box
            component="img"
            src={file.url}
            alt={file.filename}
            sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <iframe
            src={file.url}
            title={file.filename}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CheatSheetRow({
  file,
  onPreview,
  showUserId,
}: {
  file: any;
  onPreview: (file: any) => void;
  showUserId?: boolean;
}) {
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);

  const handlePreview = async () => {
    setLoadingPreview(true);
    try {
      const { blob, filename } = await getCheatSheetFile(file.checksum);
      const mimeType = blob.type || 'application/pdf';
      const url = window.URL.createObjectURL(blob);
      onPreview({ ...file, url, mimeType, filename: filename ?? file.weekId });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async () => {
    setLoadingDownload(true);
    try {
      const { blob, filename } = await getCheatSheetFile(file.checksum);
      const mimeType = blob.type || 'application/pdf';
      const safeBlob = blob instanceof Blob ? blob : new Blob([blob], { type: mimeType });
      const url = window.URL.createObjectURL(safeBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename ?? `${file.weekId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } finally {
      setLoadingDownload(false);
    }
  };

  const isImage = isImageMime(file.mimeType);

  return (
    <Box sx={rowStyles.root}>
      {isImage ? <ImageIcon sx={rowStyles.icon} /> : <DescriptionIcon sx={rowStyles.icon} />}
      <Box sx={rowStyles.meta}>
        <Typography variant="body2" sx={rowStyles.filename} noWrap>
          {file.weekId}
        </Typography>
        {showUserId && (
          <Typography variant="caption" sx={rowStyles.userId}>
            {file.userId}
          </Typography>
        )}
      </Box>
      <Box sx={rowStyles.actions}>
        <Tooltip title="Preview">
          <IconButton
            size="small"
            onClick={handlePreview}
            sx={rowStyles.iconBtn}
            disabled={loadingPreview}
          >
            {loadingPreview ? <CircularProgress size={14} /> : <OpenInNewIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Download">
          <IconButton
            size="small"
            onClick={handleDownload}
            sx={rowStyles.iconBtn}
            disabled={loadingDownload}
          >
            {loadingDownload ? <CircularProgress size={14} /> : <DownloadIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
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

export function UserFilterBar({
  userIds,
  selectedUserId,
  onChange,
  mergeProps,
}: {
  userIds: string[];
  selectedUserId: string | null;
  universityId: string;
  onChange: (userId: string | null) => void;
  mergeProps?: {
    courseId: string;
    instanceId: string;
    universityId: string;
    courseName: string;
  };
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

      {mergeProps && selectedUserId && (
        <InlineStudentMergeButton
          courseId={mergeProps.courseId}
          instanceId={mergeProps.instanceId}
          universityId={mergeProps.universityId}
          userId={selectedUserId}
        />
      )}
    </Box>
  );
}
export function InlineStudentMergeButton({
  courseId,
  instanceId,
  universityId,
  userId,
}: {
  courseId: string;
  instanceId: string;
  universityId: string;
  userId: string;
}) {
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const buildUrl = () =>
    `/api/cheatsheet/merge-cheatsheet?courseId=${encodeURIComponent(
      courseId
    )}&instanceId=${encodeURIComponent(instanceId)}&userId=${encodeURIComponent(
      userId
    )}&universityId=${encodeURIComponent(universityId)}`;

  const handleDownload = async () => {
    setMerging(true);
    setError(null);

    try {
      const res = await fetch(buildUrl());
      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `cheatsheets-${courseId.replace(/\s+/g, '_')}-${userId}.pdf`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message ?? 'Merge failed');
    } finally {
      setMerging(false);
    }
  };

  const handlePreview = async () => {
    setMerging(true);
    setError(null);
    try {
      const res = await fetch(buildUrl());
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewOpen(true);
    } catch (err: any) {
      setError(err?.message ?? 'Preview failed');
    } finally {
      setMerging(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Tooltip title="Preview merged cheatsheets">
          <span>
            <IconButton size="small" onClick={handlePreview} disabled={merging}>
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Button
          variant="contained"
          size="small"
          startIcon={merging ? <CircularProgress size={14} thickness={5} /> : <MergeTypeIcon />}
          onClick={handleDownload}
          disabled={merging}
        >
          {merging ? 'Merging…' : 'Merge & Download'}
        </Button>
      </Box>

      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}

      <Dialog open={previewOpen} onClose={handleClosePreview} maxWidth="lg" fullWidth>
        <DialogTitle>Merged Cheatsheet Preview</DialogTitle>

        <DialogContent sx={{ height: '80vh', p: 0 }}>
          {previewUrl && (
            <iframe src={previewUrl} width="100%" height="100%" style={{ border: 'none' }} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CheatSheetWindowsTable({
  windows,
  files,
  onPreview,
}: {
  windows: UploadWindow[];
  files: any[];
  onPreview: (file: any) => void;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const fileMap = useMemo(() => {
    const map = new Map<string, any>();
    files.forEach((file) => {
      map.set(file.weekId, file);
    });
    return map;
  }, [files]);

  const filteredWindows = windows.filter((w) => !w.isSkipped);
  const handlePreview = async (file: any) => {
    setLoadingId(file.checksum);
    try {
      const { blob, filename } = await getCheatSheetFile(file.checksum);
      const mimeType = blob.type || 'application/pdf';
      const url = window.URL.createObjectURL(blob);
      onPreview({
        ...file,
        url,
        mimeType,
        filename: filename ?? 'cheatsheet.pdf',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleDownload = async (file: any) => {
    setLoadingId(file.checksum);
    try {
      const { blob, filename } = await getCheatSheetFile(file.checksum);
      const mimeType = blob.type || 'application/pdf';
      const safeBlob = blob instanceof Blob ? blob : new Blob([blob], { type: mimeType });
      const url = window.URL.createObjectURL(safeBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename ?? 'cheatsheet.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Window</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Action</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {filteredWindows.map((window) => {
            const key = window.windowStart.split('T')[0];
            const file = fileMap.get(key);
            const isUploaded = Boolean(file);
            const isClosed = new Date(window.windowEnd) < new Date();
            const isOpen = window.isWithinWindow;

            return (
              <TableRow
                key={window.windowStart}
                sx={{
                  backgroundColor: window.isWithinWindow ? 'action.hover' : 'inherit',
                }}
              >
                <TableCell>
                  <Tooltip
                    title={`${new Date(window.windowStart).toLocaleString()} → ${new Date(
                      window.windowEnd
                    ).toLocaleString()}`}
                  >
                    <Typography variant="body2">
                      {new Date(window.windowStart).toLocaleDateString()} –{' '}
                      {new Date(window.windowEnd).toLocaleDateString()}
                    </Typography>
                  </Tooltip>
                </TableCell>

                <TableCell>
                  <Tooltip
                    title={
                      isUploaded ? `Uploaded at: ${new Date(file.createdAt).toLocaleString()}` : ''
                    }
                  >
                    <span>
                      {isUploaded ? (
                        <Chip label="Uploaded" color="success" size="small" />
                      ) : isOpen ? (
                        <Chip label="Open" color="warning" size="small" />
                      ) : isClosed ? (
                        <Chip label="Missed" color="error" size="small" />
                      ) : (
                        <Chip label="Upcoming" size="small" />
                      )}
                    </span>
                  </Tooltip>
                </TableCell>

                <TableCell align="right">
                  {isUploaded ? (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Tooltip title="Preview">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handlePreview(file)}
                            disabled={loadingId === file.checksum}
                          >
                            {loadingId === file.checksum ? (
                              <CircularProgress size={16} />
                            ) : (
                              <OpenInNewIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="Download">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleDownload(file)}
                            disabled={loadingId === file.checksum}
                          >
                            {loadingId === file.checksum ? (
                              <CircularProgress size={16} />
                            ) : (
                              <DownloadIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}

function formatDate(date: Date) {
  return date.toLocaleDateString();
}

function formatDateForStorage(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getAllUploadDays(semesterStart: Date, semesterEnd: Date, uploadStartDayName: string) {
  const uploadStartDay = toWeekdayIndex(uploadStartDayName);
  const result: Date[] = [];
  const first = new Date(semesterStart);
  const diff = (uploadStartDay - first.getDay() + 7) % 7;
  first.setDate(first.getDate() + diff);
  const current = new Date(first);
  while (current <= semesterEnd) {
    result.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return result;
}

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [hour, minute] = timeStr.split(':').map(Number);
  return { hour: hour || 0, minute: minute || 0 };
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
export function CheatsheetConfigDialog({
  open,
  onClose,
  onSave,
  semesterStart,
  semesterEnd,
  initialConfig,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  semesterStart: Date;
  semesterEnd: Date;
  initialConfig?: Record<string, any>;
}) {
  const [configStartDay, setConfigStartDay] = useState(initialConfig?.uploadStartDay || 'Monday');
  const [configEndDay, setConfigEndDay] = useState(initialConfig?.uploadEndDay);
  const startTimeParsed = parseTime(initialConfig?.uploadStartTime);
  const endTimeParsed = parseTime(initialConfig?.uploadEndTime);

  const [configStartHour, setConfigStartHour] = useState(startTimeParsed.hour);
  const [configStartMinute, setConfigStartMinute] = useState(startTimeParsed.minute);
  const [configEndHour, setConfigEndHour] = useState(endTimeParsed.hour);
  const [configEndMinute, setConfigEndMinute] = useState(endTimeParsed.minute);
  const [cheatsheetStart, setCheatsheetStart] = useState<string>(
    initialConfig?.cheatsheetStart ?? ''
  );
  const [cheatsheetEnd, setCheatsheetEnd] = useState<string>(initialConfig?.cheatsheetEnd ?? '');
  const [cheatsheetSkip, setCheatsheetSkip] = useState<string[]>(
    initialConfig?.cheatsheetSkip ?? []
  );
  const uploadDays = useMemo(() => {
    return getAllUploadDays(semesterStart, semesterEnd, configStartDay);
  }, [semesterStart, semesterEnd, configStartDay]);
  const filteredEndDays = useMemo(() => {
    if (!cheatsheetStart) return uploadDays;
    return uploadDays.filter((d) => d >= new Date(cheatsheetStart));
  }, [uploadDays, cheatsheetStart]);
  const skipRanges = useMemo(() => {
    return uploadDays.map((start) => {
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return {
        value: formatDateForStorage(start),
        label: `${formatDate(start)} - ${formatDate(end)}`,
      };
    });
  }, [uploadDays]);

  const handleSave = () => {
    onSave({
      uploadStartDay: configStartDay,
      uploadEndDay: configEndDay,
      uploadStartTime: formatTime(configStartHour, configStartMinute),
      uploadEndTime: formatTime(configEndHour, configEndMinute),
      cheatsheetStart,
      cheatsheetEnd,
      cheatsheetSkip,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configure Cheatsheet Upload Window</DialogTitle>
      <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography fontWeight="bold">Upload Window</Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 1, alignItems: 'center' }}>
            <Select
              value={configStartDay}
              onChange={(e) => setConfigStartDay(e.target.value as string)}
              size="small"
              sx={{ minWidth: 120 }}
            >
              {WEEKDAYS.map((day) => (
                <MenuItem key={day} value={day}>
                  {day}
                </MenuItem>
              ))}
            </Select>

            <Select
              value={configStartHour}
              onChange={(e) => setConfigStartHour(e.target.value as number)}
              size="small"
              sx={{ width: 70 }}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <MenuItem key={i} value={i}>
                  {String(i).padStart(2, '0')}
                </MenuItem>
              ))}
            </Select>

            <Typography>:</Typography>

            <Select
              value={configStartMinute}
              onChange={(e) => setConfigStartMinute(e.target.value as number)}
              size="small"
              sx={{ width: 70 }}
            >
              {Array.from({ length: 60 }, (_, i) => (
                <MenuItem key={i} value={i}>
                  {String(i).padStart(2, '0')}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mt: 2, alignItems: 'center' }}>
            <Select
              value={configEndDay}
              onChange={(e) => setConfigEndDay(e.target.value as string)}
              size="small"
              sx={{ minWidth: 120 }}
            >
              {WEEKDAYS.map((day) => (
                <MenuItem key={day} value={day}>
                  {day}
                </MenuItem>
              ))}
            </Select>

            <Select
              value={configEndHour}
              onChange={(e) => setConfigEndHour(e.target.value as number)}
              size="small"
              sx={{ width: 70 }}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <MenuItem key={i} value={i}>
                  {String(i).padStart(2, '0')}
                </MenuItem>
              ))}
            </Select>

            <Typography>:</Typography>

            <Select
              value={configEndMinute}
              onChange={(e) => setConfigEndMinute(e.target.value as number)}
              size="small"
              sx={{ width: 70 }}
            >
              {Array.from({ length: 60 }, (_, i) => (
                <MenuItem key={i} value={i}>
                  {String(i).padStart(2, '0')}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </Box>
        <Box>
          <Typography fontWeight="bold">Cheatsheet Start</Typography>
          <Select
            fullWidth
            value={cheatsheetStart}
            onChange={(e) => setCheatsheetStart(e.target.value)}
          >
            {uploadDays.map((date) => (
              <MenuItem key={formatDateForStorage(date)} value={formatDateForStorage(date)}>
                {formatDate(date)}
              </MenuItem>
            ))}
          </Select>
        </Box>
        <Box>
          <Typography fontWeight="bold">Cheatsheet End</Typography>
          <Select
            fullWidth
            value={cheatsheetEnd}
            onChange={(e) => setCheatsheetEnd(e.target.value)}
          >
            {filteredEndDays.map((date) => (
              <MenuItem key={formatDateForStorage(date)} value={formatDateForStorage(date)}>
                {formatDate(date)}
              </MenuItem>
            ))}
          </Select>
        </Box>
        <Box>
          <Typography fontWeight="bold">Cheatsheet Skip</Typography>
          <Select
            fullWidth
            multiple
            value={cheatsheetSkip}
            onChange={(e) => setCheatsheetSkip(e.target.value as string[])}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((val) => {
                  const found = skipRanges.find((r) => r.value === val);

                  return <Chip key={val} label={`Week of ${found?.label}`} size="small" />;
                })}
              </Box>
            )}
          >
            {skipRanges.map((range) => (
              <MenuItem key={range.value} value={range.value}>
                <Checkbox checked={cheatsheetSkip.includes(range.value)} />
                <ListItemText primary={`Week of ${range.label}`} />
              </MenuItem>
            ))}
          </Select>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Weekly windows are generated based on your upload start day and semester duration.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const mergeStyles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5,
    flexShrink: 0,
  },
  btn: {
    fontWeight: 600,
    textTransform: 'none',
    borderRadius: 2,
    whiteSpace: 'nowrap',
  },
  progress: {
    borderRadius: 4,
    height: 3,
  },
  error: {
    fontSize: 10,
    lineHeight: 1.3,
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
    flexWrap: 'wrap',
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

const dateRangeStyles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    my: 2,
    p: 2,
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: 'background.paper',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  groupLabel: {
    fontWeight: 600,
    color: 'text.secondary',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontSize: 11,
  },
  fields: {
    display: 'flex',
    gap: 2,
    flexWrap: 'wrap',
  },
  field: {
    flex: '1 1 200px',
    minWidth: 200,
  },
};
