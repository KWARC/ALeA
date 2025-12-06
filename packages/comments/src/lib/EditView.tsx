import { FTML } from '@flexiformal/ftml';
import { Box, Button, Checkbox, FormControlLabel } from '@mui/material';
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
    <fieldset hidden={hidden} disabled={isLoading} style={{ border: 0, margin: 0, padding: 0 }}>
      <div style={{ marginBottom: '5px' }}>
        <MystEditor
          name="comment-edit"
          placeholder={placeholder}
          value={inputText}
          onValueChange={(v) => {
            setInputText(v);
            saveDraft(uri ?? '', parentId, v);
          }}
        />
        {!existingComment && !parentId && !isPrivateNote ? (
          <FormControlLabel
            control={
              <Checkbox
                checked={needsResponse}
                onChange={(e) => setNeedsResponse(e.target.checked)}
              />
            }
            label={t.requestResponse}
          />
        ) : null}
      </div>

      <Box textAlign="right" mb="10px">
        {onCancel && (
          <Button
            variant="contained"
            disabled={isLoading}
            hidden={hidden}
            onClick={(_) => onCancel && onCancel()}
            sx={{ mr: '10px' }}
          >
            {t.cancel}
          </Button>
        )}
        <Button
          variant="contained"
          type="submit"
          disabled={!inputText || isLoading}
          hidden={hidden}
          onClick={(_) => addUpdateComment()}
        >
          {existingComment ? t.update : isPrivateNote ? t.save : t.post}
        </Button>
      </Box>
    </fieldset>
  );
}
