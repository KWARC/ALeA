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
  secInfo: Record<FTML.DocumentUri, SecInfo>;
  handleSaveSingle: (entry: LectureEntry) => void;
  handleDeleteSingle: (timestamp_ms: number) => void;
  handleSaveNotCoveredSections: (uris: string[]) => void;
}

export function CoverageUpdater({
  courseId,
  snaps,
  notCoveredSections: initialNotCoveredSections,
  secInfo,
  handleSaveSingle,
  handleDeleteSingle,
  handleSaveNotCoveredSections,
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

  const theme = useTheme();
  const getSectionName = (uri: string) => getSectionNameForUri(uri, secInfo);
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
    if (Array.isArray(initialNotCoveredSections)) {
      setNotCoveredSections(initialNotCoveredSections);
    }
  }, [initialNotCoveredSections]);

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
    </Box>
  );
}

export default CoverageUpdater;
