import { FTML } from '@kwarc/ftml-viewer';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import QuizIcon from '@mui/icons-material/Quiz';
import SaveIcon from '@mui/icons-material/Save';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { LectureEntry } from '@stex-react/utils';
import dayjs from 'dayjs';
import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { SecInfo } from '../types';
import { SlidePicker } from './SlideSelector';
import { getSlides } from '@stex-react/api';

export type FormData = LectureEntry & {
  sectionName: string;
  targetSectionName: string;
};

interface CoverageFormProps {
  formData: FormData;
  setFormData: Dispatch<SetStateAction<FormData>>;
  secInfo: Record<FTML.DocumentURI, SecInfo>;
  isEditing: boolean;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  courseId: string;
}

export function CoverageForm({
  formData,
  setFormData,
  secInfo,
  isEditing,
  onSubmit,
  onCancel,
  courseId,
}: CoverageFormProps) {
  // const [isLastSlideSelected, setIsLastSlideSelected] = useState(false);
  const hasManuallyToggledCompletion = useRef(false);

  useEffect(() => {
    const updatedData = { ...formData };
    let dataChanged = false;

    if (formData.sectionName && formData.sectionName.trim() !== '' && !formData.sectionUri) {
      const section = secInfo[formData.sectionUri];
      if (section) {
        updatedData.sectionUri = section.uri;
        dataChanged = true;
      }
    }

    if (
      formData.targetSectionName &&
      formData.targetSectionName.trim() !== '' &&
      !formData.targetSectionUri
    ) {
      const targetSection = secInfo[formData.targetSectionUri];
      if (targetSection) {
        updatedData.targetSectionUri = targetSection.uri;
        dataChanged = true;
      }
    }

    if (dataChanged) {
      setFormData(updatedData);
    }
  }, [formData, secInfo]);

  useEffect(() => {
    if (!formData.slideUri || !formData.sectionUri || formData.slideNumber !== undefined) return;
    const section = secInfo[formData.sectionUri];
    if (!section) return;
    getSlides(courseId, section.id).then(({ slides }) => {
      const index = slides.findIndex((s) => s.slide?.uri === formData.slideUri);
      if (index >= 0) {
        handleSlideUriChange(formData.slideUri, index);
      }
    });
  }, [formData.slideUri, formData.sectionUri, formData.slideNumber]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name as string]: value });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timestamp = Date.parse(e.target.value);
    setFormData({ ...formData, timestamp_ms: timestamp });
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(':').map(Number);
    const updatedTimestamp_ms = dayjs(formData.timestamp_ms)
      .set('hour', hours)
      .set('minute', minutes)
      .valueOf();
    setFormData({ ...formData, timestamp_ms: updatedTimestamp_ms });
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(':').map(Number);
    const endTime = dayjs(formData.lectureEndTimestamp_ms || formData.timestamp_ms);
    const updatedLectureEndTimestamp = endTime.set('hour', hours).set('minute', minutes).valueOf();
    setFormData({ ...formData, lectureEndTimestamp_ms: updatedLectureEndTimestamp });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, isQuizScheduled: e.target.checked });
  };

  const handleCheckboxSection = (e: React.ChangeEvent<HTMLInputElement>) => {
    hasManuallyToggledCompletion.current = true;
    setFormData({ ...formData, sectionCompleted: e.target.checked });
  };

  // const handleSlideUriChange = (uri: string | undefined, slideNumber: number | undefined) => {
  //   if (!formData.sectionUri || slideNumber === undefined || !uri) return;

  //   const section = secInfo[formData.sectionUri];
  //   if (!section) return;

  //   getSlides(courseId, section.id).then(({ slides }) => {
  //     const isLastSlide = slideNumber === slides.length;
  //     setIsLastSlideSelected(isLastSlide);
  //     setFormData((prev) => ({
  //       ...prev,
  //       slideUri: uri,
  //       slideNumber,
  //       sectionCompleted: isLastSlide,
  //     }));
  //   });
  // };

  const handleSlideUriChange = (
    uri: string | undefined,
    slideNumber: number | undefined,
    isLastSlide?: boolean
  ) => {
    console.log('handleSlideUriChange', {
      uri,
      slideNumber,
      isLastSlide,
      manuallyToggled: hasManuallyToggledCompletion.current,
    });
    if (!formData.sectionUri || slideNumber === undefined || !uri) return;
    setFormData((prev) => ({
      ...prev,
      slideUri: uri,
      slideNumber,
      sectionCompleted: !!isLastSlide,
    }));
  };

  const handleSectionChange = (event: any) => {
    const selectedUri = event.target.value as string;
    hasManuallyToggledCompletion.current = false;
    if (!selectedUri) {
      setFormData({
        ...formData,
        sectionUri: '',
        sectionName: '',
        slideUri: '',
        slideNumber: undefined,
      });
      return;
    }

    const selectedSection = secInfo[selectedUri];
    if (selectedSection) {
      setFormData({
        ...formData,
        sectionUri: selectedUri,
        sectionName: selectedSection.title.trim(),
        slideUri: '',
        slideNumber: undefined,
      });
    }
  };

  const handleTargetSectionChange = (event: any) => {
    const selectedUri = event.target.value as string;

    if (!selectedUri) {
      setFormData({
        ...formData,
        targetSectionUri: '',
        targetSectionName: '',
      });
      return;
    }

    const selectedSection = secInfo[selectedUri];
    if (selectedSection) {
      setFormData({
        ...formData,
        targetSectionUri: selectedUri,
        targetSectionName: selectedSection.title.trim(),
      });
    }
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Date"
          type="date"
          name="date"
          value={dayjs(formData.timestamp_ms).format('YYYY-MM-DD')}
          onChange={handleDateChange}
          InputLabelProps={{
            shrink: true,
          }}
          sx={{ mb: { xs: 2, md: 0 } }}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Clip ID"
          name="clipId"
          value={formData.clipId}
          onChange={handleChange}
          placeholder="Enter clip ID"
          variant="outlined"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Lecture Start Time"
          type="time"
          name="startTime"
          value={dayjs(formData.timestamp_ms).format('HH:mm')}
          onChange={handleStartTimeChange}
          placeholder="Enter Start Time"
          variant="outlined"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Lecture End Time"
          type="time"
          name="endTime"
          value={dayjs(formData.lectureEndTimestamp_ms).format('HH:mm')}
          onChange={handleEndTimeChange}
          placeholder="Enter End Time"
          variant="outlined"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Venue"
          name="venue"
          value={formData.venue || ''}
          onChange={handleChange}
          placeholder="Enter venue name"
          variant="outlined"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Venue Link"
          name="venueLink"
          value={formData.venueLink || ''}
          onChange={handleChange}
          placeholder="https://example.com"
          variant="outlined"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel id="section-name-select-label">Section (actually) Completed</InputLabel>
          <Select
            labelId="section-name-select-label"
            value={formData.sectionUri}
            onChange={handleSectionChange}
            name="sectionUri"
            label="Section (actually) Completed"
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {Object.values(secInfo).map((section) => {
              const duration = section.duration || 0;
              const roundedMinutes = Math.ceil(duration / 60);

              let displayTime = '';
              if (roundedMinutes >= 60) {
                const hours = Math.floor(roundedMinutes / 60);
                const minutes = roundedMinutes % 60;
                displayTime = ` (${hours} hr${hours > 1 ? 's' : ''}${
                  minutes ? ` ${minutes} min${minutes > 1 ? 's' : ''}` : ''
                })`;
              } else if (roundedMinutes > 0) {
                displayTime = ` (${roundedMinutes} min${roundedMinutes > 1 ? 's' : ''})`;
              }

              return (
                <MenuItem key={section.uri} value={section.uri}>
                  {section.title}
                  {displayTime}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel id="target-section-select-label">Target Section</InputLabel>
          <Select
            labelId="target-section-select-label"
            value={formData.targetSectionUri}
            onChange={handleTargetSectionChange}
            name="targetSectionUri"
            label="Target Section"
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {Object.values(secInfo).map((section) => (
              <MenuItem key={section.uri} value={section.uri}>
                {section.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <SlideshowIcon sx={{ mr: 1, fontSize: 20 }} />
          Slide Selection
        </Typography>
        <SlidePicker
          courseId={courseId}
          sectionUri={formData.sectionUri}
          slideUri={formData.slideUri}
          setSlideUri={handleSlideUriChange}
          secInfo={secInfo}
        />
      </Grid>

      <Grid item xs={12}>
        <Divider sx={{ my: 1 }} />
        <FormControlLabel
          control={
            <Checkbox
              checked={!!formData.sectionCompleted}
              onChange={handleCheckboxSection}
              color="warning"
            />
          }
          label={
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
              <DoneAllIcon sx={{ mr: 0.5, color: 'success.main' }} fontSize="small" />
              Section Completed
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Divider sx={{ my: 1 }} />
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.isQuizScheduled}
              onChange={handleCheckboxChange}
              color="warning"
            />
          }
          label={
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
              <QuizIcon sx={{ mr: 0.5, color: 'warning.main' }} fontSize="small" />
              Quiz Scheduled
            </Typography>
          }
        />
      </Grid>

      <Grid item xs={12}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            mt: 3,
            gap: 1,
          }}
        >
          {isEditing && (
            <Button variant="outlined" onClick={onCancel} startIcon={<ClearIcon />}>
              Cancel
            </Button>
          )}

          <Button
            variant="contained"
            color="primary"
            onClick={() => onSubmit(formData)}
            startIcon={isEditing ? <SaveIcon /> : <AddIcon />}
          >
            {isEditing ? 'Update' : 'Add Entry'}
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
}

export default CoverageForm;
