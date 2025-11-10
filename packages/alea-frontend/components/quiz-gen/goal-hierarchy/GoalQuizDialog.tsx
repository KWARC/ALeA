import { useEffect, useState } from 'react';
import { CircularProgress, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import { QuizPanel } from '../QuizPanel';
import { FlatQuizProblem } from 'packages/alea-frontend/pages/quiz-gen';
import { getSecInfo } from '../../coverage-update';
import { getCourseInfo, getProblemsByGoal, UserInfo } from '@alea/spec';
import { SecInfo } from 'packages/alea-frontend/types';
import { CourseInfo } from '@alea/utils';
import { contentToc } from '@flexiformal/ftml-backend';

export const GoalQuizDialog = ({
  open,
  onClose,
  goalText,
  courseId,
  userInfo,
}: {
  open: boolean;
  onClose: () => void;
  goalText: string | null;
  courseId: string;
  userInfo: UserInfo | undefined;
}) => {
  const [courses, setCourses] = useState<{ [courseId: string]: CourseInfo }>({});
  const [sections, setSections] = useState<SecInfo[]>([]);
  const [problems, setProblems] = useState<FlatQuizProblem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCourseInfo().then(setCourses);
  }, []);

  useEffect(() => {
    const getSections = async () => {
      if (!courseId) return;
      const courseInfo = courses?.[courseId as string];
      if (!courseInfo?.notes) return;
      setLoadingSections(true);
      try {
        const toc = (await contentToc({ uri: courseInfo.notes }))?.[1] ?? [];
        const formattedSections = toc.flatMap((entry) =>
          getSecInfo(entry).map(({ id, uri, title }) => ({ id, uri, title }))
        );
        setSections(formattedSections);
      } catch (error) {
        console.error('Failed to fetch document sections:', error);
      } finally {
        setLoadingSections(false);
      }
    };

    getSections();
  }, [courseId, courses]);

  useEffect(() => {
    if (!goalText || !open) return;

    const fetchProblems = async () => {
      setLoading(true);
      setProblems([]);

      try {
        const generatedProblemsResp = await getProblemsByGoal(goalText);
        const parsedProblems: FlatQuizProblem[] = generatedProblemsResp.map(
          ({ problemJson, ...rest }) => ({
            ...rest,
            ...problemJson,
          })
        );
        setProblems(parsedProblems);
      } catch (err) {
        console.error('Error fetching problems:', err);
        setProblems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, [goalText, open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 3,
          width: '80%',
          maxWidth: 900,
          maxHeight: '80%',
          bgcolor: '#f9f9ff',
        },
      }}
    >
      <DialogTitle sx={{ bgcolor: '#e3f2fd', fontWeight: 'bold', borderBottom: '1px solid #ddd' }}>
        🎯 {goalText ? `Goal: ${goalText}` : 'Quiz'}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        {loading || loadingSections ? (
          <div className="flex justify-center items-center p-10">
            <CircularProgress />
          </div>
        ) : problems.length > 0 ? (
          <QuizPanel
            problems={problems}
            currentIdx={currentIdx}
            setCurrentIdx={setCurrentIdx}
            sections={sections}
            courseId={courseId}
            userInfo={userInfo}
            hideVariantGeneration
          />
        ) : (
          <p className="text-center text-gray-500">No problems found for this goal.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
