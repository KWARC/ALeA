import { FTML } from '@kwarc/ftml-viewer';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import { LectureEntry } from '@stex-react/utils';
import { useEffect, useState } from 'react';
import { SecInfo } from '../types';
import { CoverageForm, FormData } from './CoverageForm';
import { CoverageTable } from './CoverageTable';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { AutoDetectedTooltipContent } from './AutoDetectedComponent';
import { NoMaxWidthTooltip } from '@stex-react/stex-react-renderer';

export function getSectionNameForUri(
  uri: string,
  secInfo: Record<FTML.DocumentURI, SecInfo>
): string {
  const section = secInfo[uri];
  return section?.title.trim() || '';
}

export function getNoonTimestampOnSameDay(timestamp: number) {
  return new Date(timestamp).setHours(12, 0, 0, 0);
}

function convertSnapToEntry(snap: LectureEntry): FormData {
  return {
    ...snap,
    sectionName: getSectionNameForUri(snap.sectionUri || '', {}),
    targetSectionName: getSectionNameForUri(snap.targetSectionUri || '', {}),
  };
}

interface CoverageUpdaterProps {
  courseId: string;
  snaps: LectureEntry[];
  secInfo: Record<FTML.DocumentURI, SecInfo>;
  handleSaveSingle: (entry: LectureEntry) => void;
  handleDeleteSingle: (timestamp_ms: number) => void;
}

export function CoverageUpdater({
  courseId,
  snaps,
  secInfo,
  handleSaveSingle,
  handleDeleteSingle,
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
    sectionCompleted:false
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
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
    const { sectionName, targetSectionName, ...cleanData } = formData;
    const updatedSnaps = [...snaps];
    updatedSnaps[editIndex] = {
      ...data,
      autoDetected: snaps[editIndex].autoDetected,
    };

    handleSaveSingle(cleanData);
    handleEditDialogClose();
  };

  const coverageEntries = snaps.map((snap, index) => {
    const entry = convertSnapToEntry(snap);
    entry.sectionName = getSectionNameForUri(snap.sectionUri || '', secInfo);
    entry.targetSectionName = getSectionNameForUri(snap.targetSectionUri || '', secInfo);
    return entry;
  });

  return (
    <Box sx={{ width: '100%' }}>
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
          />
        )}
      </Paper>
    </Box>
  );
}
export default CoverageUpdater;
