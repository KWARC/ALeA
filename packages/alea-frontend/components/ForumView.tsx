import AddIcon from '@mui/icons-material/Add';
import ChatIcon from '@mui/icons-material/Chat';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoneIcon from '@mui/icons-material/Done';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  Comment,
  CommentType,
  QuestionStatus,
  UserInfo,
  addComment,
  canModerateComment,
  getCourseInstanceThreads,
} from '@alea/spec';
import { MdEditor } from '@alea/markdown';
import { DateView, useCurrentUser } from '@alea/react-utils';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useReducer, useState } from 'react';
import { useCurrentTermContext } from '../contexts/CurrentTermContext';
import { getLocaleObject } from '../lang/utils';
function getDraftKey(courseId: string) {
  return `question-draft-${courseId}`;
}

function retrieveDraft(courseId: string) {
  return localStorage.getItem(getDraftKey(courseId));
}

function saveDraft(courseId: string, draft: string) {
  localStorage.setItem(getDraftKey(courseId), draft);
}

function discardDraft(courseId: string) {
  localStorage.removeItem(getDraftKey(courseId));
}

export function AskAQuestionDialog({
  onClose,
  userInfo,
}: {
  onClose: (postAnonymously: boolean, questionText?: string) => void;
  userInfo: UserInfo | undefined;
}) {
  const { forum: t } = getLocaleObject(useRouter());
  const courseId = useRouter()?.query?.courseId as string;
  const [inputText, setInputText] = useState(retrieveDraft(courseId) || '');
  const [postAnonymously, setPostAnonymously] = useState(false);
  return (
    <>
      <DialogTitle>{t.askAQuestion}</DialogTitle>
      <DialogContent>
        <MdEditor
          name="question-input"
          minRows={5}
          placeholder={t.enterQuestion}
          value={inputText}
          onValueChange={(v) => {
            setInputText(v);
            saveDraft(courseId, v);
          }}
        />
        {!!userInfo && (
          <FormControlLabel
            control={
              <Checkbox
                checked={postAnonymously}
                onChange={(e) => setPostAnonymously(e.target.checked)}
              />
            }
            label={t.postAnonymously}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(true)}>Cancel</Button>
        <Button
          onClick={() => onClose(!userInfo || postAnonymously, inputText)}
          variant="contained"
        >
          {t.post}
        </Button>
      </DialogActions>
    </>
  );
}

function ForumViewControls({
  showRemarks,
  setShowRemarks,
  showUnanswered,
  setShowUnanswered,
  markUpdate,
  courseId,
  institutionId,
  instanceId,
}: {
  showRemarks: boolean;
  setShowRemarks: (show: boolean) => void;
  showUnanswered: boolean;
  setShowUnanswered: (show: boolean) => void;
  markUpdate: () => void;
  courseId: string;
  institutionId?: string;
  instanceId?: string;
}) {
  const router = useRouter();
  const { forum: t } = getLocaleObject(router);
  const [openQuestionDialog, setOpenQuestionDialog] = useState(false);
  const { currentTermByCourseId } = useCurrentTermContext();
  const currentTermFromContext = currentTermByCourseId[courseId];
  const currentTerm = instanceId || currentTermFromContext;
  const resolvedInstitutionId = institutionId || 'FAU';
  
  const { user: userInfo } = useCurrentUser();
  const [isUserAuthorized, setIsUserAuthorized] = useState<boolean>(false);

  useEffect(() => {
    if (!courseId || !currentTerm) return;
    canModerateComment(courseId, currentTerm).then(setIsUserAuthorized);
  }, [courseId, currentTerm]);

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      bgcolor="#CCC"
      p="5px 10px"
      borderRadius="5px 5px 0 0"
    >
      <Button
        variant="contained"
        onClick={() => setOpenQuestionDialog(true)}
        sx={{ margin: '5px' }}
      >
        <AddIcon />
        &nbsp;{t.askAQuestion}
      </Button>
      {isUserAuthorized && (
        <Box display="flex">
          <FormControlLabel
            control={
              <Checkbox
                checked={showRemarks}
                onChange={(e) => setShowRemarks(e.target.checked)}
                disabled={showUnanswered}
              />
            }
            label={t.showRemarks}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={showUnanswered}
                onChange={(e) => setShowUnanswered(e.target.checked)}
              />
            }
            label={t.showOnlyUnanswered}
          />
        </Box>
      )}
      <Dialog
        open={openQuestionDialog}
        onClose={() => setOpenQuestionDialog(false)}
        fullWidth
        maxWidth="md"
      >
        <AskAQuestionDialog
          userInfo={userInfo}
          onClose={(isAnonymous, questionText) => {
            setOpenQuestionDialog(false);
            if (!questionText) return;

            addComment({
              commentId: -1,
              courseId,
              courseTerm: currentTerm,
              institutionId: resolvedInstitutionId,
              isPrivate: false,
              isAnonymous,
              commentType: CommentType.QUESTION,
              questionStatus: QuestionStatus.UNANSWERED,
              statement: questionText,
              userName: isAnonymous ? undefined : userInfo?.fullName,
            }).then(() => {
              setOpenQuestionDialog(false);
              discardDraft(courseId);
              markUpdate();
            });
          }}
        />
      </Dialog>
    </Box>
  );
}

function QuestionStatusIconNoHover({ comment }: { comment: Comment }) {
  if (comment.commentType !== CommentType.QUESTION) return <ChatIcon sx={{ color: 'gray' }} />;
  switch (comment.questionStatus) {
    case QuestionStatus.UNANSWERED:
      return <QuestionMarkIcon sx={{ color: 'goldenrod' }} />;
    case QuestionStatus.ANSWERED:
      return <DoneIcon sx={{ color: 'green' }} />;
    case QuestionStatus.ACCEPTED:
      return <CheckCircleIcon sx={{ color: 'green' }} />;
  }
}

export function QuestionStatusIcon({ comment }: { comment: Comment }) {
  return (
    <Tooltip
      title={
        comment.commentType === CommentType.QUESTION ? comment.questionStatus : CommentType.REMARK
      }
    >
      <Box>
        <QuestionStatusIconNoHover comment={comment} />
        &nbsp;
      </Box>
    </Tooltip>
  );
}

export function ForumView({ 
  courseId, 
  institutionId, 
  instanceId 
}: { 
  courseId: string; 
  institutionId?: string; 
  instanceId?: string;
}) {
  const router = useRouter();
  const { currentTermByCourseId, loadingTermByCourseId } = useCurrentTermContext();
  const currentTermFromContext = currentTermByCourseId[courseId];
  const currentTerm = instanceId || currentTermFromContext;
  const resolvedInstitutionId = institutionId || 'FAU';
  
  const [threadComments, setThreadComments] = useState<Comment[]>([]);
  const [showRemarks, setShowRemarks] = useState(false);
  const [showUnanswered, setShowUnanswered] = useState(false);
  const [updateCounter, markUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    if (!router.isReady || !courseId || !currentTerm) return;
    getCourseInstanceThreads(courseId, currentTerm, resolvedInstitutionId).then(setThreadComments);
  }, [courseId, router.isReady, updateCounter, currentTerm, resolvedInstitutionId]);

  if (!router.isReady || !courseId || (!instanceId && loadingTermByCourseId)) return <CircularProgress />;
  const toShow = showUnanswered
    ? threadComments.filter((c) => c.questionStatus === QuestionStatus.UNANSWERED)
    : showRemarks
    ? threadComments
    : threadComments.filter((c) => c.commentType === CommentType.QUESTION);
  return (
    <>
      {['ai-1', 'ai-2'].includes(courseId) && (
        <Box fontSize="large">
          Feel free to ask questions here or connect with your instructors and classmates{' '}
          <a
            href="https://matrix.to/#/#ai-12:fau.de"
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'underline' }}
          >
            on Matrix
          </a>
          .
          <br />
          <br />
        </Box>
      )}
      <ForumViewControls
        showRemarks={showRemarks}
        setShowRemarks={setShowRemarks}
        showUnanswered={showUnanswered}
        setShowUnanswered={setShowUnanswered}
        markUpdate={markUpdate}
        courseId={courseId}
        institutionId={institutionId}
        instanceId={instanceId}
      />
      <List sx={{ border: '1px solid #CCC' }} disablePadding>
        {toShow.map((comment, index) => (
          <Box key={index} bgcolor={index % 2 ? '#EEE' : undefined}>
            <ListItem disablePadding>
              <Link href={institutionId && instanceId ? `/${institutionId}/${courseId}/${instanceId}/forum/${comment.threadId}` : `/forum/${courseId}/${comment.threadId}`} style={{ width: '100%' }}>
                <ListItemButton style={{ cursor: 'pointer' }}>
                  <ListItemIcon>
                    <QuestionStatusIcon comment={comment} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <span
                        style={{
                          display: 'block',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                        }}
                      >
                        {comment.statement}
                      </span>
                    }
                    secondary={
                      <Box display="flex" justifyContent="space-between">
                        <span>{comment.userName}</span>
                        <DateView timestampMs={(comment.postedTimestampSec ?? 0) * 1000} />
                      </Box>
                    }
                  />
                </ListItemButton>
              </Link>
            </ListItem>
            {index !== threadComments.length - 1 && <Divider />}
          </Box>
        ))}
      </List>
    </>
  );
}
