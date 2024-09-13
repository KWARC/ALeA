import CheckIcon from '@mui/icons-material/Check';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { canModerateComment, Comment, getUserInfo } from '@stex-react/api';
import { ReactNode, useEffect, useReducer, useRef, useState } from 'react';
import { CommentFilters } from './comment-filters';
import {
  getPublicCommentTrees,
  refreshAllComments,
} from './comment-store-manager';
import { CommentReply } from './CommentReply';
import { CommentView } from './CommentView';

import { Refresh } from '@mui/icons-material';
import styles from './comments.module.scss';
import { CURRENT_TERM, FileLocation } from '@stex-react/utils';
import { getLocaleObject } from './lang/utils';
import { useRouter } from 'next/router';

function RenderTree({
  comment,
  file,
  refreshComments,
}: {
  comment: Comment;
  file: FileLocation;
  refreshComments: () => void;
}) {
  return (
    <>
      {comment && <CommentView comment={comment} onUpdate={refreshComments} />}
      <Box pl="7px" ml="3px" sx={{ borderLeft: '2px solid #CCC' }}>
        {(comment.childComments || []).map((child) => (
          <RenderTree
            key={child.commentId}
            comment={child}
            file={file}
            refreshComments={refreshComments}
          />
        ))}
      </Box>
    </>
  );
}

export function CommentTree({
  comments,
  file,
  refreshComments,
}: {
  comments: Comment[];
  file: FileLocation;
  refreshComments: () => void;
}) {
  return (
    <>
      {comments.map((comment) => (
        <RenderTree
          key={comment.commentId}
          comment={comment}
          file={file}
          refreshComments={refreshComments}
        />
      ))}
    </>
  );
}

function getFilteredComments(comments: Comment[], filters: CommentFilters) {
  if (!comments) return [];
  const topShadowComment: Comment = {
    commentId: -1,
    isAnonymous: false,
    isPrivate: false,
  };
  topShadowComment.childComments = comments.map(
    (comment) => structuredClone(comment) as Comment
  );
  filters.filterHidden(topShadowComment);
  return topShadowComment.childComments;
}

function treeSize(comment: Comment): number {
  if (!comment) return 0;
  if (!comment.childComments) return 1;
  return comment.childComments.reduce((sum, child) => sum + treeSize(child), 1);
}

export function ButtonAndDialog({
  buttonText,
  isDisabled,
  dialogContentCreator,
  onClose,
}: {
  buttonText: string;
  isDisabled: boolean;
  dialogContentCreator: (onClose1: (val: any) => void) => ReactNode;
  onClose: (val: any) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        sx={{ mx: '5px' }}
        variant="contained"
        onClick={() => setOpen(true)}
        disabled={isDisabled}
      >
        {buttonText}
      </Button>
      <Dialog
        onClose={() => {
          setOpen(false);
          onClose(null);
        }}
        open={open}
      >
        {dialogContentCreator((val: any) => {
          setOpen(false);
          onClose(val);
        })}
      </Dialog>
    </>
  );
}

export function CommentSection({
  file,
  startDisplay = true,
  selectedText = undefined,
  selectedElement = undefined,
  allCommentsMode = false,
}: {
  file: FileLocation;
  startDisplay?: boolean;
  selectedText?: string;
  selectedElement?: any;
  allCommentsMode?: boolean;
}) {
  const router = useRouter();
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const t = getLocaleObject(router);
  const courseId = router.query.courseId as string;

  // Menu Crap start
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  function closeAnd(func: any) {
    return () => {
      handleClose();
      func();
    };
  }
  // Menu Crap end

  // If the value wrapped in useRef actually never changes, we can dereference right in the declaration.
  const filters = useRef(
    new CommentFilters(forceUpdate, allCommentsMode, allCommentsMode)
  ).current;
  const [commentsFromStore, setCommentsFromStore] = useState([] as Comment[]);
  const [canAddComment, setCanAddComment] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredComments = getFilteredComments(commentsFromStore, filters);
  const numComments = filteredComments.reduce(
    (sum, comment) => sum + treeSize(comment),
    0
  );

  useEffect(() => {
    getUserInfo().then((userInfo) => setCanAddComment(!!userInfo?.userId));
    canModerateComment(courseId, CURRENT_TERM).then(setCanModerate);
  }, []);

  useEffect(() => {
    getPublicCommentTrees(file).then((c) => setCommentsFromStore(c));
  }, [file?.archive, file?.filepath, filters]);

  const refreshComments = async () => {
    setIsRefreshing(true);
    try {
      await refreshAllComments();
      getPublicCommentTrees(file).then((comments) => {
        setCommentsFromStore(comments);
        setIsRefreshing(false);
      });
    } catch (err) {
      console.log(err);
      setIsRefreshing(false);
    }
  };

  if (commentsFromStore == null && startDisplay) {
    return <CircularProgress size={40} />;
  }

  return (
    <div hidden={commentsFromStore == null || !startDisplay}>
      <div className={styles['header']}>
        <span style={{ marginBottom: '2px' }}>{numComments} comments</span>
        <Box>
          <IconButton disabled={isRefreshing} onClick={() => refreshComments()}>
            <Refresh />
          </IconButton>
          <IconButton onClick={handleClick} sx={{ p: '2px' }}>
            <FilterAltIcon />
          </IconButton>
        </Box>
      </div>

      <hr style={{ margin: '0 0 10px' }} />
      {canAddComment && !allCommentsMode && (
        <CommentReply
          placeholder={numComments ? t.joinDiscussion : t.startDiscussion}
          parentId={0}
          file={file}
          isPrivateNote={false}
          selectedText={selectedText}
          selectedElement={selectedElement}
          onUpdate={() => refreshComments()}
          onCancel={undefined}
        />
      )}

      <CommentTree
        comments={filteredComments}
        file={file}
        refreshComments={() => refreshComments()}
      />
      <Menu
        id="filter-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        <MenuItem onClick={closeAnd(() => filters.onShowHidden())}>
          {filters.showHidden ? <CheckIcon /> : <CheckBoxOutlineBlankIcon />}
          &nbsp;{t.showHidden}
        </MenuItem>
        {canModerate && (
          <MenuItem onClick={closeAnd(() => filters.onShowSpam())}>
            {filters.showSpam ? <CheckIcon /> : <CheckBoxOutlineBlankIcon />}
            &nbsp;{t.showSpam}
          </MenuItem>
        )}
      </Menu>
    </div>
  );
}
