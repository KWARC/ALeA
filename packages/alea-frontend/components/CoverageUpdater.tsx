import { FTML } from '@flexiformal/ftml';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Typography,
  useTheme,
  Autocomplete,
  Chip,
  TextField,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { LectureEntry } from '@alea/utils';
import { useEffect, useState } from 'react';
import { SecInfo } from '../types';
import { CoverageForm, FormData } from './CoverageForm';
import { CoverageTable } from './CoverageTable';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { AutoDetectedTooltipContent } from './AutoDetectedComponent';
import { NoMaxWidthTooltip } from '@alea/stex-react-renderer';
import { getAllCourses } from '@alea/spec';
import { UniversityDetail } from '@alea/utils';

export function getSectionNameForUri(
  uri: string,
  secInfo: Record<FTML.DocumentUri, SecInfo>
): string {
  const section = secInfo[uri];
  return section?.title.trim() || '';
}

export function getNoonTimestampOnSameDay(timestamp: number) {
  return new Date(timestamp).setHours(12, 0, 0, 0);
}

function convertSnapToEntry(snap: LectureEntry): FormData {
  if (!snap) {
    return {
      sectionName: '',
      sectionUri: '',
      targetSectionName: '',
      targetSectionUri: '',
      clipId: '',
      timestamp_ms: Date.now(),
      isQuizScheduled: false,
      slideUri: '',
      slideNumber: undefined,
      venue: '',
      venueLink: '',
      lectureEndTimestamp_ms: undefined,
      sectionCompleted: false,
    };
  }

  return {
    ...snap,
    sectionName: getSectionNameForUri(snap.sectionUri || '', {}),
    targetSectionName: getSectionNameForUri(snap.targetSectionUri || '', {}),
  };
}

interface CoverageUpdaterProps {
  courseId: string;
  snaps: LectureEntry[];
  notCoveredSections?: string[];
  outOfOrderSections?: Record<string, { startTimestamp_ms: number; endTimestamp_ms?: number }>;
  secInfo: Record<FTML.DocumentUri, SecInfo>;
  handleSaveSingle: (entry: LectureEntry) => void;
  handleDeleteSingle: (timestamp_ms: number) => void;
  handleSaveNotCoveredSections: (uris: string[]) => void;
  handleSaveOutOfOrderSections: (
    data: Record<string, { startTimestamp_ms: number; endTimestamp_ms?: number }>
  ) => void;
}

export function CoverageUpdater({
  courseId,
  snaps,
  notCoveredSections: initialNotCoveredSections,
  outOfOrderSections: initialOutOfOrderSections,
  secInfo,
  handleSaveSingle,
  handleDeleteSingle,
  handleSaveNotCoveredSections,
  handleSaveOutOfOrderSections,
}: CoverageUpdaterProps) {
  const [formData, setFormData] = useState<FormData>({
    sectionName: '',
    sectionUri: '',
    clipId: '',
    timestamp_ms: Date.now(),
    targetSectionName: '',
    targetSectionUri: '',
    isQuizScheduled: false,
    slideUri: '',
    slideNumber: undefined as number | undefined,
    venue: '',
    venueLink: '',
    lectureEndTimestamp_ms: Date.now(),
    sectionCompleted: false,
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [timezone, setTimezone] = useState<string | undefined>(undefined);

  const [notCoveredSections, setNotCoveredSections] = useState<string[]>([]);

  const [outOfOrderSections, setOutOfOrderSections] = useState<
    Record<string, { startTimestamp_ms: number; endTimestamp_ms?: number }>
  >({});

  const [selectedOutOfOrderOption, setSelectedOutOfOrderOption] = useState<{
    uri: string;
    label: string;
  } | null>(null);

  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);

  const [isTimingDialogOpen, setIsTimingDialogOpen] = useState(false);
  const [selectedSectionForTiming, setSelectedSectionForTiming] = useState<string | null>(null);

  const [manualStartTime, setManualStartTime] = useState<number | null>(null);
  const [manualEndTime, setManualEndTime] = useState<number | null>(null);

  const theme = useTheme();
  const getSectionName = (uri: string) => getSectionNameForUri(uri, secInfo);

  const formatDateTime = (timestamp?: number) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  useEffect(() => {
    if (snaps.length > 0) {
      const lastSnapUri = snaps[snaps.length - 1]?.sectionUri;
      const lastSnapName = getSectionNameForUri(lastSnapUri || '', secInfo).trim();
      setFormData((prev) => ({
        ...prev,
        sectionName: lastSnapName,
        sectionUri: lastSnapUri || '',
      }));
    }
  }, [snaps, secInfo]);

  useEffect(() => {
    async function loadTimezone() {
      try {
        const courses = await getAllCourses();
        const universityId = courses?.[courseId]?.universityId;
        if (universityId && UniversityDetail[universityId]) {
          setTimezone(UniversityDetail[universityId].defaultTimezone);
        } else {
          setTimezone(undefined);
        }
      } catch (err) {
        console.error('Failed to load university timezone', err);
      }
    }
    loadTimezone();
  }, [courseId]);

  useEffect(() => {
    setNotCoveredSections(initialNotCoveredSections);
  }, [initialNotCoveredSections]);

  useEffect(() => {
    setOutOfOrderSections(initialOutOfOrderSections ?? {});
  }, [initialOutOfOrderSections]);

  const handleDeleteItem = (index: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    const timestamp = snaps[index].timestamp_ms;
    handleDeleteSingle(timestamp);
  };

  const handleCancelEdit = () => {
    setFormData({
      sectionName: '',
      sectionUri: '',
      clipId: '',
      timestamp_ms: Date.now(),
      targetSectionName: '',
      targetSectionUri: '',
      isQuizScheduled: false,
      slideUri: '',
      slideNumber: undefined,
      venue: '',
      venueLink: '',
      lectureEndTimestamp_ms: undefined,
    });
    setEditIndex(null);
  };

  const handleSubmitForm = (formData: any) => {
    const newItem: LectureEntry = {
      timestamp_ms: Date.now(),
      sectionUri: formData.sectionUri,
      targetSectionUri: formData.targetSectionUri,
      clipId: formData.clipId,
      isQuizScheduled: formData.isQuizScheduled,
      slideUri: formData.slideUri,
      slideNumber: formData.slideNumber,
      venue: formData.venue,
      venueLink: formData.venueLink,
      lectureEndTimestamp_ms: formData.lectureEndTimestamp_ms,
      sectionCompleted: formData.sectionCompleted,
    };
    setFormData({
      sectionName: '',
      sectionUri: '',
      clipId: '',
      timestamp_ms: Date.now(),
      targetSectionName: '',
      targetSectionUri: '',
      isQuizScheduled: false,
      slideUri: '',
      slideNumber: undefined,
      venue: '',
      venueLink: '',
      lectureEndTimestamp_ms: Date.now(),
      sectionCompleted: false,
    });
    handleSaveSingle(newItem);
  };

  const handleEditDialogOpen = (entry: FormData, index: number) => {
    console.log('setformdata', entry.slideUri);

    setFormData({ ...entry });
    setEditIndex(index);
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    handleCancelEdit();
    setEditIndex(null);
  };

  const handleEditDialogSave = (data: FormData) => {
    if (editIndex === null) return;
    const { sectionName, targetSectionName, ...cleanData } = data;
    const originalTimestamp = snaps[editIndex].timestamp_ms;
    const entryToSave = {
      ...cleanData,
      timestamp_ms: originalTimestamp,
    };
    handleSaveSingle(entryToSave);
    handleEditDialogClose();
  };

  const coverageEntries = snaps
    .filter((snap): snap is LectureEntry => Boolean(snap))
    .map((snap) => {
      const entry = convertSnapToEntry(snap);
      entry.sectionName = getSectionNameForUri(snap.sectionUri || '', secInfo);
      entry.targetSectionName = getSectionNameForUri(snap.targetSectionUri || '', secInfo);
      return entry;
    });

  const allLectureOptions = snaps
    .slice()
    .sort((a, b) => a.timestamp_ms - b.timestamp_ms)
    .map((snap) => ({
      startLabel: new Date(snap.timestamp_ms).toLocaleString([], {
        month: 'short',
        day: 'numeric',
      }),
      endLabel: snap.lectureEndTimestamp_ms
        ? new Date(snap.lectureEndTimestamp_ms).toLocaleString([], {
            month: 'short',
            day: 'numeric',
          })
        : '—',
      start: snap.timestamp_ms,
      end: snap.lectureEndTimestamp_ms,
    }));

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Skipped Sections
        </Typography>

        {notCoveredSections.length > 0 && (
          <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {notCoveredSections.map((uri) => (
              <Chip
                key={uri}
                label={secInfo[uri]?.title}
                color="warning"
                onDelete={() => {
                  const updated = notCoveredSections.filter((u) => u !== uri);
                  setNotCoveredSections(updated);
                  handleSaveNotCoveredSections(updated);
                }}
                deleteIcon={<CloseIcon />}
              />
            ))}
          </Box>
        )}

        <Autocomplete
          multiple
          renderTags={() => null}
          options={Object.entries(secInfo).map(([uri, sec]) => ({
            uri,
            label: sec.title,
          }))}
          value={Object.entries(secInfo)
            .filter(([uri]) => notCoveredSections.includes(uri))
            .map(([uri, sec]) => ({ uri, label: sec.title }))}
          isOptionEqualToValue={(option, value) => option.uri === value.uri}
          getOptionLabel={(o) => o.label}
          onChange={(_, newValue) => {
            const uris = Array.from(new Set(newValue.map((v) => v.uri)));
            setNotCoveredSections(uris);
            handleSaveNotCoveredSections(uris);
          }}
          renderInput={(params) => (
            <TextField {...params} label="Add skipped sections" placeholder="Select sections" />
          )}
        />
      </Box>

      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Out of Order Sections
      </Typography>

      {Object.keys(outOfOrderSections).length > 0 && (
        <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {Object.entries(outOfOrderSections).map(([uri, value]) => (
            <Tooltip
              key={uri}
              arrow
              title={
                <Box>
                  <Typography variant="body2">
                    <strong>Start:</strong> {formatDateTime(value.startTimestamp_ms)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>End:</strong> {formatDateTime(value.endTimestamp_ms)}
                  </Typography>
                </Box>
              }
            >
              <Chip
                key={uri}
                label={secInfo[uri]?.title}
                color="error"
                onDelete={() => setSectionToDelete(uri)}
              />
            </Tooltip>
          ))}
        </Box>
      )}

      <Autocomplete
        value={selectedOutOfOrderOption}
        options={Object.entries(secInfo).map(([uri, sec]) => ({
          uri,
          label: sec.title,
        }))}
        getOptionLabel={(o) => o.label}
        onChange={(_, value) => {
          if (!value) return;

          setSelectedOutOfOrderOption(null);
          setSelectedSectionForTiming(value.uri);
          setIsTimingDialogOpen(true);
        }}
        renderInput={(params) => <TextField {...params} label="Add out of order section" />}
      />

      {snaps.length > 0 ? (
        <>
          <CoverageTable
            courseId={courseId}
            entries={snaps}
            secInfo={secInfo}
            onEdit={(idx) => {
              const entry = coverageEntries[idx];
              const auto: typeof entry.autoDetected & { slideNumber?: number } = entry.autoDetected;

              const shouldPrefill =
                entry.sectionUri === '' || entry.sectionUri === 'update-pending';

              const merged = {
                ...entry,
                clipId: shouldPrefill ? auto?.clipId || '' : entry.clipId,
                sectionUri: shouldPrefill ? auto?.sectionUri || '' : entry.sectionUri,
                slideUri: shouldPrefill ? auto?.slideUri || '' : entry.slideUri,
                slideNumber: shouldPrefill ? auto?.slideNumber : entry.slideNumber,
                autoDetected: auto,
              };

              handleEditDialogOpen(merged, idx);
            }}
            onDelete={handleDeleteItem}
          />
        </>
      ) : (
        <Box
          sx={{
            py: 5,
            textAlign: 'center',
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: `1px dashed ${theme.palette.divider}`,
            mb: 4,
          }}
        >
          <Typography variant="body1" color="text.secondary" gutterBottom>
            No syllabus entries yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use the form below to add your first entry
          </Typography>
        </Box>
      )}
      <Dialog open={editDialogOpen} onClose={handleEditDialogClose} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          Edit Coverage Entry
          {formData.autoDetected && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="info.main" fontWeight="bold">
                Auto-detected Data
              </Typography>
              <NoMaxWidthTooltip
                title={
                  <Box
                    sx={{
                      maxWidth: '600px',
                      backgroundColor: 'white',
                      color: '#1a237e',
                      p: 2,
                      border: '1px solid #ccc',
                    }}
                  >
                    <Box sx={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                      <Typography fontWeight="bold" mb={1}>
                        Auto-detected Data
                      </Typography>
                      <AutoDetectedTooltipContent
                        autoDetected={formData.autoDetected}
                        getSectionName={getSectionName}
                      />
                    </Box>
                  </Box>
                }
              >
                <IconButton size="small" color="info">
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </NoMaxWidthTooltip>
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          <br />
          <CoverageForm
            formData={formData}
            setFormData={setFormData}
            secInfo={secInfo}
            isEditing={true}
            onSubmit={handleEditDialogSave}
            onCancel={handleEditDialogClose}
            courseId={courseId}
            timezone={timezone}
          />
        </DialogContent>
      </Dialog>

      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, sm: 3 },
          mt: 4,
          mb: 3,
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" gutterBottom color={'textPrimary'}>
          Add New Lecture
        </Typography>

        {!editDialogOpen && (
          <CoverageForm
            courseId={courseId}
            formData={formData}
            setFormData={setFormData}
            secInfo={secInfo}
            isEditing={false}
            onSubmit={handleSubmitForm}
            onCancel={handleCancelEdit}
            timezone={timezone}
          />
        )}
      </Paper>

      <Dialog
        open={isTimingDialogOpen}
        onClose={() => setIsTimingDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Teaching Duration</DialogTitle>

        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Section:{' '}
            <strong>
              {selectedSectionForTiming ? secInfo[selectedSectionForTiming]?.title : ''}
            </strong>
          </Typography>

          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Start Date
          </Typography>

          <Autocomplete
            options={allLectureOptions}
            value={allLectureOptions.find((o) => o.start === manualStartTime) || null}
            isOptionEqualToValue={(option, value) => option.start === value.start}
            getOptionLabel={(o) => o.startLabel}
            sx={{ mb: 2 }}
            onChange={(_, value) => {
              if (!value) return;

              setManualStartTime(value.start);

              setManualEndTime(value.end ?? null);
            }}
            renderInput={(params) => <TextField {...params} label="Select Start Date" />}
          />

          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            End Date
          </Typography>

          <Autocomplete
            options={allLectureOptions.filter((o) => o.end)}
            value={
              allLectureOptions.filter((o) => o.end).find((o) => o.end === manualEndTime) || null
            }
            isOptionEqualToValue={(option, value) => option.end === value.end}
            getOptionLabel={(o) => o.endLabel}
            onChange={(_, value) => {
              if (!value || !value.end) return;

              setManualEndTime(value.end);
            }}
            renderInput={(params) => <TextField {...params} label="Select End Date" />}
          />
        </DialogContent>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2 }}>
          <Chip
            label="Cancel"
            onClick={() => {
              setIsTimingDialogOpen(false);
              setSelectedSectionForTiming(null);
              setManualStartTime(null);
              setManualEndTime(null);
            }}
          />

          <Chip
            color="primary"
            label="Save"
            onClick={() => {
              if (!selectedSectionForTiming || !manualStartTime || !manualEndTime) return;

              const start = manualStartTime;
              const end = manualEndTime;

              if (!start || !end) return;

              if (end <= start) return;

              const updated = {
                ...outOfOrderSections,
                [selectedSectionForTiming]: {
                  startTimestamp_ms: start,
                  endTimestamp_ms: end,
                },
              };

              setOutOfOrderSections(updated);
              handleSaveOutOfOrderSections(updated);

              setIsTimingDialogOpen(false);
              setSelectedSectionForTiming(null);
              setManualStartTime(null);
              setManualEndTime(null);
            }}
          />
        </Box>
      </Dialog>

      <Dialog open={sectionToDelete !== null} onClose={() => setSectionToDelete(null)}>
        <DialogTitle>Remove Out of Order Section?</DialogTitle>

        <DialogContent>
          <Typography>
            Are you sure you want to remove{' '}
            <strong>{sectionToDelete ? secInfo[sectionToDelete]?.title : ''}</strong>?
          </Typography>
        </DialogContent>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2 }}>
          <Chip label="Cancel" onClick={() => setSectionToDelete(null)} />

          <Chip
            color="error"
            label="Remove"
            onClick={() => {
              if (!sectionToDelete) return;

              const updated = { ...outOfOrderSections };
              delete updated[sectionToDelete];

              setOutOfOrderSections(updated);
              handleSaveOutOfOrderSections(updated);

              setSectionToDelete(null);
            }}
          />
        </Box>
      </Dialog>
    </Box>
  );
}

export default CoverageUpdater;
