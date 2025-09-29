import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Box, Button, CircularProgress, IconButton } from '@mui/material';
import {
  Comment,
  CommentType,
  QuestionStatus,
  canAccessResource,
  getCommentsForThread,
  updateQuestionState,
} from '@alea/spec';
import { CommentTree, organizeHierarchically } from '@alea/comments';
import { Action, ResourceName } from '@alea/utils';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useReducer, useState } from 'react';
import { useCurrentTermContext } from '../contexts/CurrentTermContext';
import { getLocaleObject } from '../lang/utils';
import { QuestionStatusIcon } from './ForumView';
import { FTMLFragment } from '@kwarc/ftml-react';

export function ThreadView({ courseId, threadId }: { courseId: string; threadId: number }) {
  const { forum: t } = getLocaleObject(useRouter());
  const { currentTerm, loading: termLoading, setCourseId } = useCurrentTermContext();
  
  useEffect(() => {
    if (courseId) {
      setCourseId(courseId);
    }
  }, [courseId, setCourseId]);
  const [threadComments, setThreadComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [updateCounter, doUpdate] = useReducer((x) => x + 1, 0);
  const [isUserAuthorized, setIsUserAuthorized] = useState<boolean>(false);
  useEffect(() => {
    if (!threadId) return;
    getCommentsForThread(threadId).then((comments) => {
      setThreadComments(organizeHierarchically(comments));
      setIsLoading(false);
    });
  }, [threadId, updateCounter]);

  useEffect(() => {
    if (!currentTerm) return;
    canAccessResource(ResourceName.COURSE_COMMENTS, Action.MODERATE, {
      courseId,
      instanceId: currentTerm,
    }).then(setIsUserAuthorized);
  }, [courseId, currentTerm]);

  if (!threadComments?.length) return null;

  const uri = threadComments[0].uri;

  const currentState = threadComments[0].questionStatus;
  if (isLoading) return <CircularProgress />;
  return (
    <>
      <Box display="flex" justifyContent="space-between" mb="15px">
        <Link href={`/forum/${courseId}`}>
          <IconButton>
            <ArrowBackIcon />
          </IconButton>
        </Link>
        <Box display="flex" alignItems="center">
          <QuestionStatusIcon comment={threadComments[0]} />
          {isUserAuthorized && threadComments[0].commentType === CommentType.QUESTION ? (
            <>
              <Button
                variant="contained"
                onClick={async () => {
                  const newState =
                    currentState === QuestionStatus.UNANSWERED
                      ? QuestionStatus.ANSWERED
                      : QuestionStatus.UNANSWERED;
                  await updateQuestionState(threadId, CommentType.QUESTION, newState);
                  doUpdate();
                }}
              >
                Mark{' '}
                {currentState === QuestionStatus.UNANSWERED
                  ? QuestionStatus.ANSWERED
                  : QuestionStatus.UNANSWERED}
              </Button>

              <Button
                variant="contained"
                sx={{ ml: '5px' }}
                onClick={async () => {
                  const confirmText =
                    'Are you sure you want to mark this comment as a remark and hide it from the forum? You can also consider marking it as answered instead.';
                  if (!confirm(confirmText)) return;
                  await updateQuestionState(threadId, CommentType.REMARK, QuestionStatus.OTHER);
                  doUpdate();
                  alert(`Comment type changed to a remark!`);
                }}
              >
                Dont Show In Forum
              </Button>
            </>
          ) : null}
        </Box>
      </Box>
      {uri &&
        (showContent ? (
          <Box
            fragment-uri={uri}
            fragment-kind="Section"
            bgcolor="#DDD"
            borderRadius="5px"
            mb="15px"
          >
            <FTMLFragment fragment={{ type: 'FromBackend', uri: uri }} />
          </Box>
        ) : (
          <Button onClick={() => setShowContent(true)} variant="contained" sx={{ mb: '15px' }}>
            {t.showReferredContent}&nbsp;
            <VisibilityIcon />
          </Button>
        ))}
      <CommentTree
        comments={threadComments}
        uri={threadComments[0].uri}
        refreshComments={() => doUpdate()}
      />
    </>
  );
}
