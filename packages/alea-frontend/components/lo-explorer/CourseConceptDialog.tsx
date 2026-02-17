import { conceptUriToName, getAllCourses, getDefiniedaInSectionAgg } from '@alea/spec';
import { CourseInfo } from '@alea/utils';
import { contentToc } from '@flexiformal/ftml-backend';
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
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { SecInfo } from 'packages/alea-frontend/types';
import React, { useEffect, useState } from 'react';
import { getSecInfo } from '../coverage-update';

export const CourseConceptsDialog = ({
  open,
  onClose,
  setChosenConcepts,
}: {
  open: boolean;
  onClose: () => void;
  setChosenConcepts: React.Dispatch<React.SetStateAction<string[]>>;
}) => {
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo }>({});
  const [allSectionDetails, setAllSectionDetails] = useState<{
    [courseId: string]: SecInfo[];
  }>({});
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedCourseSections, setSelectedCourseSections] = useState<SecInfo[]>([]);
  const [selectedSection, setSelectedSection] = useState<SecInfo | null>(null);
  const [sectionConcepts, setSectionConcepts] = useState<{ label: string; value: string }[]>([]);
  const [processedOptions, setProcessedOptions] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const selectAllKey = 'Select All';

  useEffect(() => {
    getAllCourses().then(setCourses);
  }, []);

  useEffect(() => {
    async function getCourseSections() {
      const secDetails: Record<string, SecInfo[]> = {};
      for (const courseId of Object.keys(courses)) {
        const notesUri = courses?.[courseId]?.notes;
        if (!notesUri) continue;
        const toc = (await contentToc({ uri: notesUri }))?.[2] ?? [];
        secDetails[courseId] = toc.flatMap((entry) => getSecInfo(entry));
      }
      setAllSectionDetails(secDetails);
    }
    getCourseSections();
  }, [courses]);

  const handleCourseChange = (event: SelectChangeEvent) => {
    const courseId: string = event.target.value;
    setSelectedCourse(courseId);
    setSelectedCourseSections(allSectionDetails[courseId]);
  };

  const handleSectionChange = async (event: SelectChangeEvent) => {
    const sectionTitle = event.target.value;
    const selectedSection = selectedCourseSections.find(
      (section) => section.title === sectionTitle
    );
    if (selectedSection) {
      setSelectedSection(selectedSection);
    }
    setLoading(true);
    try {
      const concepts = await getDefiniedaInSectionAgg(selectedSection?.uri);
      const uniqueConceptUris = [...new Set(concepts.map((c) => c.conceptUri))];
      setProcessedOptions(
        uniqueConceptUris.map((uri) => ({
          label: `${conceptUriToName(uri)} (${uri})`,
          value: uri,
        }))
      );
    } catch (error) {
      console.error('Error fetching concepts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (_e: any, newValue: { label: string; value: string }[]) => {
    if (newValue.some((item) => item.value === selectAllKey)) {
      const allConcepts = processedOptions.filter((item) => item.value !== selectAllKey);
      setSectionConcepts(newValue.length === processedOptions.length + 1 ? [] : allConcepts);
    } else {
      setSectionConcepts(newValue);
    }
  };

  const handleSelectButtonClick = () => {
    const selectedUris = sectionConcepts.map((item) => item.value);
    setChosenConcepts((prevSelected: string[]) => [...new Set([...prevSelected, ...selectedUris])]);
    setSectionConcepts([]);
  };
  const getLabel = (option) =>
    option.value === selectAllKey
      ? `${selectAllKey} (${processedOptions.length - 1})`
      : option.label;
  return (
    <Box sx={{ display: 'flex' }}>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>Choose Course Concepts</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: '100px' }}>
              <InputLabel id="select-course-label">Course</InputLabel>
              <Select
                labelId="select-course-label"
                value={selectedCourse}
                onChange={handleCourseChange}
                label="Course"
              >
                {Object.keys(courses).map((courseId) => (
                  <MenuItem key={courseId} value={courseId}>
                    {courseId}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: '300px', flex: '1 1 auto' }}>
              <InputLabel id="section-select-label">Choose Section</InputLabel>
              <Select
                labelId="section-select-label"
                value={selectedSection?.title}
                onChange={handleSectionChange}
                label="Choose Section"
              >
                {selectedCourseSections.map((section, idx) => (
                  <MenuItem key={idx} value={section.title}>
                    {section.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={24} sx={{ marginRight: 2 }} />
                <Typography variant="body1">Loading Concepts...</Typography>
              </Box>
            ) : (
              <FormControl sx={{ minWidth: '300px', flex: '1 1 auto' }}>
                <Autocomplete
                  multiple
                  limitTags={2}
                  fullWidth
                  disableCloseOnSelect
                  options={
                    processedOptions.length > 0
                      ? [{ label: selectAllKey, value: selectAllKey }, ...processedOptions]
                      : processedOptions
                  }
                  getOptionLabel={getLabel}
                  value={sectionConcepts}
                  onChange={handleOptionChange}
                  renderOption={(props, option, { selected }) => (
                    <li
                      {...props}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}
                    >
                      <Checkbox
                        checked={
                          option.value === selectAllKey
                            ? sectionConcepts.length === processedOptions.length
                            : selected
                        }
                        style={{ marginRight: 8 }}
                      />
                      <ListItemText
                        primary={
                          <Tooltip title={option.label}>
                            <span style={{ overflowWrap: 'anywhere' }}>{option.label}</span>
                          </Tooltip>
                        }
                      />
                    </li>
                  )}
                  renderInput={(params) => <TextField {...params} label="Choose Concept" />}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        label={conceptUriToName(option.value)}
                        {...getTagProps({ index })}
                        key={index}
                        // color="primary"
                      />
                    ))
                  }
                />
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              handleSelectButtonClick();
              onClose();
            }}
            variant="contained"
          >
            Select
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
