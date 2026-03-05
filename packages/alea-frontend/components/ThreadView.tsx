import { CommentTree, organizeHierarchically } from '@alea/comments';
import {
  canAccessResource,
  Comment,
  CommentType,
  getCommentsForThread,
  getUserInformation,
  QuestionStatus,
  reopenQuestion,
  updateQuestionState,
  UserInformation,
} from '@alea/spec';
import { SafeFTMLFragment, SafeFTMLSetup } from '@alea/stex-react-renderer';
import { Action, getCoursePdfUrl, ResourceName } from '@alea/utils';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Box, Button, CircularProgress, IconButton } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useCurrentTermContext } from '../contexts/CurrentTermContext';
import { getLocaleObject } from '../lang/utils';
import { QuestionStatusIcon } from './ForumView';

const HIGHLIGHT_MARK_ATTR = 'data-ref';
const HIGHLIGHT_MARK_VALUE = 'true';
const HIGHLIGHT_MARK_SELECTOR = `mark[${HIGHLIGHT_MARK_ATTR}="${HIGHLIGHT_MARK_VALUE}"]`;

function removeOldHighlights(container: HTMLElement) {
  const marks = container.querySelectorAll(HIGHLIGHT_MARK_SELECTOR);

  marks.forEach((m) => {
    const parent = m.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(m.textContent || ''), m);
    parent.normalize();
  });
}

function highlightExactText(container: HTMLElement, rawText: string) {
  if (!container || !rawText) return;

  const selectedText = rawText.replace(/\s+/g, ' ').trim();
  if (!selectedText) return;
  removeOldHighlights(container);

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let fullText = '';

  while (walker.nextNode()) {
    const n = walker.currentNode as Text;
    if (!n.nodeValue) continue;
    nodes.push(n);
    fullText += n.nodeValue;
  }

  const normalizedFull = fullText.replace(/\s+/g, ' ');
  const normalizedSelected = selectedText.replace(/\s+/g, ' ');

  const idx = normalizedFull.toLowerCase().indexOf(normalizedSelected.toLowerCase());
  if (idx === -1) return;

  let realStart = -1;
  let realEnd = -1;
  let normPos = 0;
  let i = 0;

  while (i < fullText.length) {
    const ch = fullText[i];
    if (/\s/.test(ch)) {
      while (i < fullText.length && /\s/.test(fullText[i])) i++;
      if (normPos === idx) realStart = i;
      normPos++;
      if (normPos === idx + normalizedSelected.length) {
        realEnd = i;
        break;
      }
      continue;
    }

    if (normPos === idx && realStart === -1) realStart = i;
    normPos++;

    if (normPos === idx + normalizedSelected.length) {
      realEnd = i + 1;
      break;
    }
    i++;
  }

  if (realStart === -1 || realEnd === -1) return;

  let startNode: Text | null = null;
  let endNode: Text | null = null;
  let startOffset = 0;
  let endOffset = 0;
  let count = 0;

  for (const node of nodes) {
    const txt = node.nodeValue || '';
    const nextCount = count + txt.length;

    if (!startNode && realStart >= count && realStart < nextCount) {
      startNode = node;
      startOffset = realStart - count;
    }

    if (!endNode && realEnd > count && realEnd <= nextCount) {
      endNode = node;
      endOffset = realEnd - count;
    }
    count = nextCount;

    if (startNode && endNode) break;
  }
  if (!startNode || !endNode) return;

  try {
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);

    const mark = document.createElement('mark');
    mark.setAttribute(HIGHLIGHT_MARK_ATTR, HIGHLIGHT_MARK_VALUE);
    mark.className = 'alea-highlight-mark';

    const contents = range.extractContents();
    mark.appendChild(contents);
    range.insertNode(mark);

    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (e) {
    startNode.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function waitForRenderedContentAndHighlight(container: HTMLElement, selectedText: string) {
  if (!container) return;

  const tryHighlight = () => {
    if (container.innerText.trim().length === 0) return false;
    highlightExactText(container, selectedText);

    const mark = container.querySelector(HIGHLIGHT_MARK_SELECTOR);
    return !!mark;
  };

  if (tryHighlight()) return;
  const observer = new MutationObserver(() => {
    requestAnimationFrame(() => {
      if (tryHighlight()) observer.disconnect();
    });
  });
  observer.observe(container, { childList: true, subtree: true });

  return () => observer.disconnect();
}

export function ThreadView({ courseId, threadId }: { courseId: string; threadId: number }) {
  const router = useRouter();
  const { forum: t } = getLocaleObject(router);
  const { currentTermByCourseId, loadingTermByCourseId } = useCurrentTermContext();
  const currentTerm = currentTermByCourseId[courseId];
  const [threadComments, setThreadComments] = useState<Comment[]>([]);
  const [updateCounter, doUpdate] = useReducer((x) => x + 1, 0);
  const [showContent, setShowContent] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<UserInformation | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(true);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getUserInformation()
      .then(setLoggedInUser)
      .catch(() => setLoggedInUser(null));
  }, []);

  useEffect(() => {
    if (!threadId) return;
    setIsLoadingThread(true);
    getCommentsForThread(threadId)
      .then((comments) => {
        setThreadComments(organizeHierarchically(comments));
      })
      .finally(() => {
        setIsLoadingThread(false);
      });
  }, [threadId, updateCounter]);

  useEffect(() => {
    if (!currentTerm) return;
    canAccessResource(ResourceName.COURSE_COMMENTS, Action.MODERATE, {
      courseId,
      instanceId: currentTerm,
    })
      .then(setIsModerator)
      .catch(() => setIsModerator(false));
  }, [courseId, currentTerm]);

  const rootComment = useMemo(() => {
    return threadComments.find((c) => c.commentType === CommentType.QUESTION) || null;
  }, [threadComments]);
  const isLoading = loadingTermByCourseId || isLoadingThread;
  const isOwner = loggedInUser?.userId && rootComment?.userId === loggedInUser.userId;

  const canReopen =
    !!rootComment &&
    !!isOwner &&
    rootComment.commentType === CommentType.QUESTION &&
    rootComment.questionStatus === QuestionStatus.ANSWERED;

  const canMarkAnswer =
    !!rootComment &&
    isModerator &&
    rootComment.commentType === CommentType.QUESTION &&
    !!rootComment.commentId;

  useEffect(() => {
    if (!showContent) return;
    if (!rootComment?.selectedText) return;
    if (!contentRef.current) return;

    const cleanup = waitForRenderedContentAndHighlight(
      contentRef.current,
      rootComment.selectedText
    );
    return () => {
      cleanup?.();
    };
  }, [showContent, rootComment?.selectedText]);

  if (isLoading) return <CircularProgress />;
  if (!rootComment) return null;

  const uri = rootComment.uri;

  return (
    <>
      <Box sx={threadViewStyles.topBar}>
        <Link href={`/forum/${courseId}`}>
          <IconButton>
            <ArrowBackIcon />
          </IconButton>
        </Link>

        <Box sx={threadViewStyles.topRight}>
          <QuestionStatusIcon comment={rootComment} />

          {canMarkAnswer && (
            <>
              <Button
                variant="contained"
                onClick={async () => {
                  const newState =
                    rootComment.questionStatus === QuestionStatus.UNANSWERED
                      ? QuestionStatus.ANSWERED
                      : QuestionStatus.UNANSWERED;

                  await updateQuestionState(threadId, CommentType.QUESTION, newState);
                  doUpdate();
                }}
              >
                Mark{' '}
                {rootComment.questionStatus === QuestionStatus.UNANSWERED
                  ? 'Answered'
                  : 'Unanswered'}
              </Button>

              <Button
                variant="contained"
                sx={threadViewStyles.mlButton}
                onClick={async () => {
                  if (!confirm('Are you sure you want to hide this from the forum?')) return;

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
              sx={threadViewStyles.mlButton}
              onClick={async () => {
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
            sx={threadViewStyles.referredBox}
          >
            <Box sx={threadViewStyles.pdfRow}>
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
              <SafeFTMLFragment fragment={{ type: 'FromBackend', uri }} />
            </SafeFTMLSetup>
          </Box>
        ) : (
          <Button
            onClick={() => setShowContent(true)}
            variant="contained"
            sx={threadViewStyles.showBtn}
          >
            {t.showReferredContent}&nbsp;
            <VisibilityIcon />
          </Button>
        ))}

      <CommentTree
        comments={threadComments}
        uri={rootComment.uri}
        refreshComments={() => doUpdate()}
      />

      <style jsx global>{`
        mark.alea-highlight-mark {
          background: #ffeb3b;
          color: #000;
          border-radius: 2px;
          padding: 0 2px;
        }
      `}</style>
    </>
  );
}

const threadViewStyles = {
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    mb: 2,
  },
  topRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    flexWrap: 'wrap',
  },
  mlButton: {
    ml: 0.5,
  },
  showBtn: {
    mb: 2,
  },
  referredBox: {
    bgcolor: 'background.default',
    borderRadius: 1,
    mb: 2,
    p: 2,
    border: '1px solid',
    borderColor: 'divider',
  },
  pdfRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    mb: 1.5,
  },
};
