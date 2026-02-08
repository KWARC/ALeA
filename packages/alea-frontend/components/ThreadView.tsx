import { CommentTree, organizeHierarchically } from '@alea/comments';
import {
  Comment,
  CommentType,
  QuestionStatus,
  UserInformation,
  canAccessResource,
  getCommentsForThread,
  getUserInformation,
  reopenQuestion,
  updateQuestionState,
} from '@alea/spec';
import { Action, getCoursePdfUrl, ResourceName } from '@alea/utils';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Box, Button, CircularProgress, IconButton } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useCurrentTermContext } from '../contexts/CurrentTermContext';
import { getLocaleObject } from '../lang/utils';
import { QuestionStatusIcon } from './ForumView';
import { SafeFTMLFragment, SafeFTMLSetup } from '@alea/stex-react-renderer';

export function ThreadView({ courseId, threadId }: { courseId: string; threadId: number }) {
  const { forum: t } = getLocaleObject(useRouter());
  const { currentTermByCourseId, loadingTermByCourseId } = useCurrentTermContext();
  const currentTerm = currentTermByCourseId[courseId];
  const [threadComments, setThreadComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [updateCounter, doUpdate] = useReducer((x) => x + 1, 0);
  const [isUserAuthorized, setIsUserAuthorized] = useState<boolean>(false);
  const [loggedInUser, setLoggedInUser] = useState<UserInformation | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getUserInformation().then(setLoggedInUser);
  }, []);

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

  function removeOldHighlights(container: HTMLElement) {
    const marks = container.querySelectorAll('mark[data-ref="true"]');
    marks.forEach((m) => {
      const parent = m.parentNode;
      if (!parent) return;

      parent.replaceChild(document.createTextNode(m.textContent || ''), m);
      parent.normalize();
    });
  }

  function highlightExactText(container: HTMLElement, rawText: string) {
    if (!container || !rawText) return;

    const selectedText = rawText.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!selectedText) return;

    removeOldHighlights(container);

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let fullText = '';

    while (walker.nextNode()) {
      const n = walker.currentNode as Text;
      nodes.push(n);
      fullText += n.nodeValue?.replace(/\s+/g, ' ') || '';
    }

    const idx = fullText.toLowerCase().indexOf(selectedText);

    if (idx === -1) return;

    let startNode: Text | null = null;
    let endNode: Text | null = null;
    let startOffset = 0;
    let endOffset = 0;

    let count = 0;
    const endIndex = idx + selectedText.length;

    for (const node of nodes) {
      const txt = (node.nodeValue || '').replace(/\s+/g, ' ');
      const nextCount = count + txt.length;

      if (!startNode && idx >= count && idx < nextCount) {
        startNode = node;
        startOffset = idx - count;
      }

      if (!endNode && endIndex > count && endIndex <= nextCount) {
        endNode = node;
        endOffset = endIndex - count;
      }

      count = nextCount;
      if (startNode && endNode) break;
    }

    if (startNode && endNode) {
      const range = document.createRange();

      try {
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);

        const mark = document.createElement('mark');
        mark.setAttribute('data-ref', 'true');

        mark.style.backgroundColor = 'yellow';
        mark.style.color = 'black';
        mark.style.borderRadius = '2px';
        mark.style.padding = '0 2px';

        const contents = range.extractContents();
        mark.appendChild(contents);
        range.insertNode(mark);

        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {
        startNode.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  useEffect(() => {
    if (!showContent || !contentRef.current || !threadComments.length) return;

    const selectedText = threadComments[0]?.selectedText;
    if (!selectedText) return;

    const container = contentRef.current;
    let attempts = 0;
    const maxAttempts = 50;

    const interval = setInterval(() => {
      attempts++;

      if (container.querySelector('mark[data-ref="true"]')) {
        clearInterval(interval);
        return;
      }

      if (container.innerText.trim().length > 0) {
        highlightExactText(container, selectedText);
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [showContent, threadComments, updateCounter]);

  if (!threadComments.length) return null;

  const rootComment = threadComments[0];
  const uri = rootComment.uri;
  const currentState = rootComment.questionStatus;

  if (isLoading || loadingTermByCourseId) return <CircularProgress />;

  const isModerator = isUserAuthorized;
  const isOwner = loggedInUser?.userId === rootComment.userId;
  const canReopen =
    (isModerator || isOwner) &&
    rootComment.commentType === CommentType.QUESTION &&
    rootComment.questionStatus === QuestionStatus.ANSWERED;

  return (
    <>
      <Box display="flex" justifyContent="space-between" mb="15px">
        <Link href={`/forum/${courseId}`}>
          <IconButton>
            <ArrowBackIcon />
          </IconButton>
        </Link>

        <Box display="flex" alignItems="center">
          <QuestionStatusIcon comment={rootComment} />

          {isModerator && rootComment.commentType === CommentType.QUESTION && (
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
                Mark {currentState === QuestionStatus.UNANSWERED ? 'Answered' : 'Unanswered'}
              </Button>

              <Button
                variant="contained"
                sx={{ ml: '5px' }}
                onClick={async () => {
                  if (!confirm('Are you sure?')) return;
                  await updateQuestionState(threadId, CommentType.REMARK, QuestionStatus.OTHER);
                  doUpdate();
                }}
              >
                Dont Show In Forum
              </Button>
            </>
          )}

          {canReopen && (
            <Button
              variant="contained"
              color="warning"
              sx={{ ml: '5px' }}
              onClick={async () => {
                // await reopenQuestion(threadId);
                await reopenQuestion(rootComment.commentId);
                doUpdate();
              }}
            >
              Reopen Question
            </Button>
          )}
        </Box>
      </Box>

      {uri &&
        (showContent ? (
          <Box
            ref={contentRef}
            fragment-uri={uri}
            fragment-kind="Section"
            bgcolor="#DDD"
            borderRadius="5px"
            mb="15px"
            p="10px"
          >
            <Box display="flex" justifyContent="flex-end" mb="10px">
              <Button
                variant="contained"
                color="secondary"
                onClick={() => {
                  const pdfUrl = getCoursePdfUrl(uri);
                  window.open(pdfUrl, '_blank');
                }}
              >
                Open PDF
              </Button>
            </Box>

            <SafeFTMLSetup allowFullscreen={false}>
              <SafeFTMLFragment fragment={{ type: 'FromBackend', uri: uri }} />
            </SafeFTMLSetup>
          </Box>
        ) : (
          <Button onClick={() => setShowContent(true)} variant="contained" sx={{ mb: '15px' }}>
            {t.showReferredContent}&nbsp;
            <VisibilityIcon />
          </Button>
        ))}

      <CommentTree
        comments={threadComments}
        uri={rootComment.uri}
        refreshComments={() => doUpdate()}
      />
    </>
  );
}
