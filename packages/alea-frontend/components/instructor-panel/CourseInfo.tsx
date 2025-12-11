import {
  addCourseMetadata,
  CourseInfoMetadata,
  getAclUserDetails,
  getCourseAcls,
  getCourseInfoMetadata,
  InstructorInfo,
  updateCourseInfoMetadata,
  updateHasHomework,
  updateHasQuiz,
  getAllAclMembers,
} from '@alea/spec';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';

import { useRouter } from 'next/router';
import { getLocaleObject } from '../../lang/utils';
import { useEffect, useState } from 'react';

interface CourseInfoTabProps {
  courseId: string;
  instanceId: string;
}

interface CourseInstructorExt {
  id: string;
  name: string;
  isNamed: boolean;
  url: string;
}

export default function CourseInfoTab({ courseId, instanceId }: CourseInfoTabProps) {
  const router = useRouter();
  const { courseInfo: t } = getLocaleObject(router);

  const [courseInfo, setCourseInfo] = useState<CourseInfoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [seriesId, setSeriesIdState] = useState('');

  const [isNew, setIsNew] = useState(false);

  const [instructors, setInstructors] = useState<CourseInstructorExt[]>([]);
  const [instructorsLoading, setInstructorsLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady || !courseId || !instanceId) return;
    async function load() {
      setLoading(true);
      setInstructorsLoading(true);

      let resolvedInfo: CourseInfoMetadata | null = null;

      try {
        const info = await getCourseInfoMetadata(courseId, instanceId);
        resolvedInfo = info;
        setSeriesIdState(info.seriesId || '');
        setCourseInfo(info);
        setIsNew(false);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          resolvedInfo = {
            courseId,
            instanceId,

            universityId: '',
            courseName: '',
            notes: '',
            landing: '',
            slides: '',
            teaser: '',

            instructors: [],

            lectureSchedule: [],
            scheduleType: 'lecture',
            hasHomework: false,
            hasQuiz: false,
            seriesId: '',
            updaterId: '',
          };
          setCourseInfo(resolvedInfo);
          setSeriesIdState('');
          setIsNew(true);
        } else {
          console.error('Failed to load course info', err);
          setToast({ type: 'error', text: 'Failed to load course info' });
          setLoading(false);
          setInstructorsLoading(false);
          return;
        }
      }

      try {
        const savedInstructors = resolvedInfo!.instructors ?? [];
        const savedMap = new Map<string, InstructorInfo>(
          resolvedInfo.instructors.map((s) => [s.id, s])
        );

        const aclIds = await getCourseAcls(courseId, instanceId);
        const instructorAclIds = (aclIds || []).filter((id) => id.endsWith('-instructors'));

        const aclMemberLists = await Promise.all(
          instructorAclIds.map(async (aclId) => {
            try {
              const users = await getAllAclMembers(aclId);
              return Array.isArray(users) ? users : [];
            } catch (e) {
              return [];
            }
          })
        );

        const memberMap = new Map<string, { userId: string; fullName?: string }>();
        for (const list of aclMemberLists) {
          for (const u of list) {
            if (!memberMap.has(u.userId)) {
              memberMap.set(u.userId, { userId: u.userId, fullName: u.fullName });
            }
          }
        }

        for (const s of savedInstructors) {
          if (!memberMap.has(s.id)) {
            memberMap.set(s.id, { userId: s.id, fullName: s.name || '' });
          }
        }

        const merged: CourseInstructorExt[] = savedInstructors.map((saved) => ({
          id: saved.id,
          name: saved.name,
          isNamed: true,
          url: (saved as any).url || '',
        }));

        for (const [id, { fullName }] of memberMap.entries()) {
          if (!savedMap.has(id)) {
            merged.push({
              id,
              name: fullName || '',
              isNamed: false,
              url: '',
            });
          }
        }

        setInstructors(merged);
      } catch (err) {
        console.error(err);
        setToast({ type: 'error', text: t.instructorsFetchFailed });
      } finally {
        setLoading(false);
        setInstructorsLoading(false);
      }
    }

    load();
  }, [router.isReady, courseId, instanceId]);

  const setField = (field: keyof CourseInfoMetadata, value: any) => {
    setCourseInfo((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = [...instructors];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);

    setInstructors(items);
  };

  const handleNamedToggle = (i: number, checked: boolean) => {
    setInstructors((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], isNamed: checked };

      return next;
    });
  };
  const handleUrlChange = (i: number, url: string) => {
    setInstructors((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], url };

      return next;
    });
  };
  const handleSave = async () => {
    if (!courseInfo) return;

    setSaving(true);

    try {
      const instructorsToSave: InstructorInfo[] = instructors
        .filter((ins) => ins.isNamed)
        .map((ins) => ({
          id: ins.id,
          name: ins.name.trim(),
          url: ins.url.trim() || '',
        }));

      const payload: CourseInfoMetadata = {
        ...courseInfo,
        instructors: instructorsToSave,
        seriesId,
        courseId,
        instanceId,
      };

      if (isNew) {
        await addCourseMetadata(payload);
        setToast({ type: 'success', text: t.courseInfoCreated });
        setIsNew(false);
      } else {
        await updateCourseInfoMetadata(payload);
        setToast({ type: 'success', text: t.courseInfoUpdated });
      }

      setCourseInfo(payload);
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', text: t.courseInfoSaveFailed });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !courseInfo) {
    return (
      <Box sx={{ p: 5, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper', mt: 2 }}>
      <Typography variant="h6" fontWeight="bold" color="primary" mb={2}>
        {t.title}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
        <TextField
          required
          label={t.courseName}
          value={courseInfo.courseName}
          onChange={(e) => setField('courseName', e.target.value)}
          fullWidth
        />

        <TextField
          required
          label={t.universityId}
          value={courseInfo.universityId || ''}
          onChange={(e) => setField('universityId', e.target.value)}
          fullWidth
        />

        <TextField
          required
          label={t.notesUrl}
          value={courseInfo.notes}
          onChange={(e) => setField('notes', e.target.value)}
          fullWidth
        />

        <TextField
          required
          label={t.landingPage}
          value={courseInfo.landing}
          onChange={(e) => setField('landing', e.target.value)}
          fullWidth
        />

        <TextField
          required
          label={t.slidesUrl}
          value={courseInfo.slides}
          onChange={(e) => setField('slides', e.target.value)}
          fullWidth
        />

        <TextField
          required
          label={t.teaser}
          value={courseInfo.teaser || ''}
          onChange={(e) => setField('teaser', e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 5, flexWrap: 'wrap', mt: '7px' }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={courseInfo.hasHomework || false}
              onChange={async (e) => {
                const next = e.target.checked;
                if (!confirm(t.confirmUpdateHomework)) return;

                try {
                  await updateHasHomework({ courseId, instanceId, hasHomework: next });
                  setField('hasHomework', next);
                } catch (err) {
                  console.error('Failed to update homework', err);
                  setToast({ type: 'error', text: 'Failed to update homework setting' });
                }
              }}
            />
          }
          label={t.enableHomework}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={courseInfo.hasQuiz || false}
              onChange={async (e) => {
                const next = e.target.checked;
                if (!confirm(t.confirmUpdateQuiz)) return;

                try {
                  await updateHasQuiz({ courseId, instanceId, hasQuiz: next });
                  setField('hasQuiz', next);
                } catch (err) {
                  console.error('Failed to update quiz', err);
                  setToast({ type: 'error', text: 'Failed to update quiz setting' });
                }
              }}
            />
          }
          label={t.enableQuiz}
        />
        <TextField
          label={t.seriesIdLabel}
          value={seriesId}
          size="small"
          sx={{ width: 140 }}
          placeholder="4334"
          onChange={(e) => setSeriesIdState(e.target.value)}
        />
      </Box>

      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle1" fontWeight="bold" mb={1}>
        Instructors
      </Typography>

      {instructorsLoading ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      ) : instructors.length === 0 ? (
        <Box sx={{ p: 2, color: 'text.secondary' }}>{t.noInstructors}</Box>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="instructors">
            {(provided) => (
              <Box ref={provided.innerRef} {...provided.droppableProps}>
                {instructors.map((inst, i) => (
                  <Draggable key={inst.id} draggableId={inst.id} index={i}>
                    {(p) => (
                      <Box
                        ref={p.innerRef}
                        {...p.draggableProps}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,

                          p: 1,
                          mb: 1,
                          borderBottom: '1px solid #ddd',
                        }}
                      >
                        <Box
                          {...p.dragHandleProps}
                          sx={{
                            cursor: 'grab',
                            pr: 1,
                            color: 'text.secondary',
                          }}
                        >
                          <DragIndicatorIcon />
                        </Box>

                        <Typography sx={{ minWidth: 260 }}>
                          <strong>{inst.id}</strong> &nbsp;
                          <span style={{ color: '#666' }}>({inst.name})</span>
                        </Typography>

                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={inst.isNamed}
                              onChange={(e) => handleNamedToggle(i, e.target.checked)}
                            />
                          }
                          label={t.named}
                        />
                        <TextField
                          label="URL"
                          placeholder=" "
                          size="small"
                          value={inst.url || ''}
                          onChange={(e) => handleUrlChange(i, e.target.value)}
                          sx={{ minWidth: 250 }}
                        />
                      </Box>
                    )}
                  </Draggable>
                ))}

                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <Divider sx={{ my: 3 }} />

      <Button
        variant="contained"
        color="primary"
        onMouseDown={() => setIgnoreBlur(true)}
        onClick={handleSave}
        disabled={saving}
        sx={{ px: 3 }}
      >
        {saving ? t.saving : t.saveChanges}
      </Button>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)}>
        <Alert severity={toast?.type}>{toast?.text}</Alert>
      </Snackbar>
    </Paper>
  );
}
