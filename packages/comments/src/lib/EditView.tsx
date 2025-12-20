import { FTML } from '@flexiformal/ftml';
import { Box, Button, Checkbox, FormControlLabel, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {
  Comment,
  CommentType,
  QuestionStatus,
  addComment,
  editComment,
  getUserInfo,
} from '@alea/spec';
import { MystEditor } from '@alea/myst';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useCurrentTermContext } from '../../../alea-frontend/contexts/CurrentTermContext';
import { discardDraft, retrieveDraft, saveDraft } from './comment-helpers';
import { getLocaleObject } from './lang/utils';
import { useCommentRefresh } from '@alea/react-utils';
import { clearCommentStore } from './comment-store-manager';

interface EditViewProps {
  uri?: FTML.Uri;
  isPrivateNote: boolean;
  postAnonymously: boolean;
  parentId?: number;
  selectedText?: string;
  existingComment?: Comment;
  placeholder?: string;
  hidden?: boolean;
  onCancel?: () => void;
  onUpdate: () => void;
}

export function EditView({
  uri,
  isPrivateNote,
  postAnonymously = false,
  selectedText = undefined,
  parentId = 0,
  existingComment = undefined,
  placeholder = '',
  hidden = false,
  onCancel = undefined,
  onUpdate,
}: EditViewProps) {
  const router = useRouter();
  const courseId = router.query['courseId'] as string;
  const { currentTermByCourseId } = useCurrentTermContext();
  const currentTerm = currentTermByCourseId[courseId];

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(undefined);
  const [inputText, setInputText] = useState(existingComment?.statement || '');
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [needsResponse, setNeedsResponse] = useState(true);
  const t = getLocaleObject(router);
  const { triggerRefresh } = useCommentRefresh();

  useEffect(() => {
    getUserInfo().then((userInfo) => {
      setUserName(userInfo?.fullName);
    });
  }, []);

  useEffect(() => {
    if (existingComment) return;
    const retreived = retrieveDraft(uri ?? '', parentId);
    setInputText(retreived || '');
  }, [uri, parentId, existingComment]);

  function getNewComment() {
    const courseTerm = courseId ? currentTerm : undefined;
    const isQuestion = needsResponse && !parentId && !isPrivateNote;

    return {
      commentId: -1,
      uri: uri,
      parentCommentId: parentId,
      courseId,
      courseTerm,
      institutionId: 'FAU', // TODO(M5)
      statement: inputText,
      isPrivate: isPrivateNote,
      isAnonymous: postAnonymously,
      commentType: isQuestion ? CommentType.QUESTION : CommentType.REMARK,
      questionStatus: isQuestion ? QuestionStatus.UNANSWERED : undefined,
      selectedText,
      userName,
      pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
    };
  }

  const addUpdateComment = async () => {
    setIsLoading(true);
    try {
      if (existingComment) {
        await editComment(existingComment.commentId, inputText);
      } else {
        await addComment(getNewComment());
        if (uri) {
          clearCommentStore(uri);
        }
        triggerRefresh();
      }
      onUpdate();
    } catch (err) {
      setIsLoading(false);
      setError(err);
      alert(t.updateFailure);
      return;
    }
    discardDraft(uri ?? '', parentId);
    setIsLoading(false);
    if (!existingComment) setInputText('');
  };

  return (
    <Box
      sx={{
        display: hidden ? 'none' : 'block',
        opacity: isLoading ? 0.6 : 1,
        pointerEvents: isLoading ? 'none' : 'auto',
        transition: 'opacity 0.2s ease',
      }}
    >
      <Box
        sx={{
          mb: 2,
          '& .myst-editor': {
            borderRadius: 2,
            border: '1.5px solid',
            borderColor: 'divider',
            transition: 'all 0.2s ease',
            backgroundColor: 'background.paper',
            '&:hover': {
              borderColor: 'rgba(102, 126, 234, 0.3)',
            },
            '&:focus-within': {
              borderColor: '#667eea',
              borderWidth: '2px',
              boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
            },
          },
          '& .myst-editor textarea, & .myst-editor [contenteditable]': {
            fontSize: '15px',
            lineHeight: 1.6,
            color: 'text.primary',
            padding: '14px 16px',
            minHeight: '100px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            '&::placeholder': {
              color: 'text.secondary',
              opacity: 0.6,
            },
          },
        }}
      >
        <MystEditor
          name="comment-edit"
          placeholder={placeholder}
          value={inputText}
          onValueChange={(v) => {
            setInputText(v);
            saveDraft(uri ?? '', parentId, v);
          }}
        />
      </Box>
      {!existingComment && !parentId && !isPrivateNote && (
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={needsResponse}
                onChange={(e) => setNeedsResponse(e.target.checked)}
                sx={{
                  color: 'primary.main',
                  '&.Mui-checked': {
                    color: 'primary.main',
                  },
                }}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <HelpOutlineIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>{t.requestResponse}</span>
              </Box>
            }
          />
        </Box>
      )}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5,
          alignItems: 'center',
        }}
      >
        {onCancel && (
          <Button
            variant="outlined"
            disabled={isLoading}
            onClick={(_) => onCancel && onCancel()}
            startIcon={<CloseIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 14,
              px: 3,
              py: 1,
              borderRadius: 2,
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover': {
                borderColor: 'text.secondary',
                backgroundColor: 'action.hover',
              },
            }}
          >
            {t.cancel}
          </Button>
        )}

        <Button
          variant="contained"
          type="submit"
          disabled={!inputText || isLoading}
          onClick={(_) => addUpdateComment()}
          startIcon={
            isLoading ? (
              <CircularProgress size={18} color="inherit" />
            ) : existingComment ? (
              <SaveIcon />
            ) : isPrivateNote ? (
              <SaveIcon />
            ) : (
              <SendIcon />
            )
          }
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            fontSize: 14,
            px: 3,
            py: 1,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
              transform: 'translateY(-1px)',
            },
            '&:disabled': {
              background: 'rgba(0, 0, 0, 0.12)',
              color: 'rgba(0, 0, 0, 0.26)',
              boxShadow: 'none',
            },
            transition: 'all 0.2s ease',
          }}
        >
          {existingComment ? t.update : isPrivateNote ? t.save : t.post}
        </Button>
      </Box>
    </Box>
  );
}
