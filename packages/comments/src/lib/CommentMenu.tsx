import BlockIcon from '@mui/icons-material/Block';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ShieldTwoToneIcon from '@mui/icons-material/ShieldTwoTone';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { Dialog, IconButton, Menu, MenuItem } from '@mui/material';
import {
  Comment,
  HiddenStatus,
  deleteComment,
  grantPoints,
  isHiddenNotSpam,
  isSpam,
  updateCommentState
} from '@alea/spec';
import { ConfirmDialogContent } from '@alea/react-utils';
import { useRouter } from 'next/router';
import { ReactNode, useState } from 'react';
import { HideDialogContent } from './HideDialogContent';
import {
  GrantInfo,
  PointsGrantDialogContent,
} from './PointsGrantDialogContent';
import { getLocaleObject } from './lang/utils';

const P_DELETE = 'delete';
const P_HIDE = 'hide';
export interface HiddenState {
  hiddenStatus: HiddenStatus;
  hiddenJustification: string;
}
export function MenuItemAndDialog({
  menuContent,
  dialogContentCreator,
  onClose,
}: {
  menuContent: ReactNode;
  dialogContentCreator: (onClose1: (val: any) => void) => ReactNode;
  onClose: (val: any) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <MenuItem onClick={() => setOpen(true)}>{menuContent}</MenuItem>
      <Dialog
        onClose={() => {
          setOpen(false);
          onClose(null);
        }}
        open={open}
        onKeyDown={(e) => e.stopPropagation()}
        onKeyUp={(e) => e.stopPropagation()}
      >
        {dialogContentCreator((val: any) => {
          setOpen(false);
          onClose(val);
        })}
      </Dialog>
    </>
  );
}

export interface HideData {
  forSpam: boolean;
  forUnhide: boolean;
}

export function CommentMenu({
  comment,
  canModerate,
  canEditComment,
  setEditingComment,
  onUpdate,
}: {
  comment: Comment;
  canModerate: boolean;
  canEditComment: boolean;
  setEditingComment: any;
  onUpdate: () => void;
}) {
  const t = getLocaleObject(useRouter());
  // menu crap start
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  // menu crap end

  const hiddenOrSpam =
    isHiddenNotSpam(comment.hiddenStatus) || isSpam(comment.hiddenStatus);
  const canHideComment = canModerate && !hiddenOrSpam;
  const canUnhideComment = canModerate && hiddenOrSpam;

  function deleteCommentIfConfirmed(confirmed?: boolean) {
    if (!confirmed) return;
    // asyncState.startProcess(P_DELETE);
    deleteComment(comment.commentId).then(
      (_success) => {
        // asyncState.endProcess(P_DELETE);
        onUpdate();
      },
      (err) => alert(t.deleteFailure)
      //(err) => asyncState.failProcess(err, 'Failed to delete comment', P_DELETE)
    );
  }

  function updateHiddenState(state: HiddenState, onUpdate: () => void) {
    if (!state) {
      return;
    }
    //asyncState.startProcess(P_HIDE);
    updateCommentState(
      comment.commentId,
      state.hiddenStatus,
      state.hiddenJustification
    ).then(
      (success) => {
        onUpdate();
        // asyncState.endProcess(P_HIDE);
      },
      (err) => alert(t.updateFailure)
      //(err) => asyncState.failProcess(err, 'Failed to update comment', P_HIDE)
    );
  }

  function doGrantPoints(info: GrantInfo, onUpdate: () => void) {
    if (!info) {
      return;
    }
    //asyncState.startProcess(P_HIDE);
    grantPoints(
      comment.commentId,
      info.numPoints,
      info.reason
    ).then(
      (success) => {
        onUpdate();
        // asyncState.endProcess(P_HIDE);
      },
      (err) => alert(t.updateFailure)
      //(err) => asyncState.failProcess(err, 'Failed to update comment', P_HIDE)
    );
  }

  const moderatorIcon = canModerate ? (
    <sup>
      <ShieldTwoToneIcon sx={{ fontSize: '14px' }} />
    </sup>
  ) : null;
  return (
    <div style={{ display: 'inline', float: 'right' }}>
      <IconButton
        id="options-menu"
        sx={{ p: '0px 12px' }}
        onClick={handleClick}
        size="small"
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        id="comment-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{ 'aria-labelledby': 'basic-button' }}
      >
        {canEditComment && (
          <MenuItem
            onClick={() => {
              setEditingComment(true);
              handleClose();
            }}
          >
            <EditIcon />
            &nbsp;{t.edit}
          </MenuItem>
        )}
        {canEditComment && (
          <MenuItemAndDialog
            menuContent={
              <>
                <DeleteIcon />
                &nbsp;{t.delete}
              </>
            }
            dialogContentCreator={(onClose: (confirmed: boolean) => void) => (
              <ConfirmDialogContent
                textContent={t.deletePrompt}
                title={t.deleteTitle}
                okText={t.delete}
                onClose={onClose}
              />
            )}
            onClose={(v) => {
              handleClose();
              deleteCommentIfConfirmed(v);
            }}
          />
        )}

        {canHideComment && (
          <MenuItemAndDialog
            menuContent={
              <>
                <VisibilityOffIcon />
                &nbsp;{t.hideBelow}
                {moderatorIcon}
              </>
            }
            dialogContentCreator={(onClose: (state?: HiddenState) => void) => (
              <HideDialogContent
                forSpam={false}
                forUnhide={false}
                onClose={onClose}
              />
            )}
            onClose={(state) => {
              handleClose();
              updateHiddenState(state, onUpdate);
            }}
          />
        )}
        {canUnhideComment && (
          <MenuItemAndDialog
            menuContent={
              <>
                <VisibilityIcon />
                &nbsp;{t.unhide}
                {moderatorIcon}
              </>
            }
            dialogContentCreator={(onClose: (state?: HiddenState) => void) => (
              <HideDialogContent
                forSpam={false}
                forUnhide={true}
                onClose={onClose}
              />
            )}
            onClose={(state) => {
              handleClose();
              updateHiddenState(state, onUpdate);
            }}
          />
        )}
        {canHideComment && (
          <MenuItemAndDialog
            menuContent={
              <>
                <BlockIcon />
                &nbsp;{t.spam}
                {moderatorIcon}
              </>
            }
            dialogContentCreator={(onClose: (state?: HiddenState) => void) => (
              <HideDialogContent
                forSpam={true}
                forUnhide={false}
                onClose={onClose}
              />
            )}
            onClose={(state) => {
              handleClose();
              updateHiddenState(state, onUpdate);
            }}
          />
        )}
        {canModerate && (
          <MenuItemAndDialog
            menuContent={
              <>
                <VolunteerActivismIcon />
                &nbsp;{t.points}
                {moderatorIcon}
              </>
            }
            dialogContentCreator={(onClose: (grant?: GrantInfo) => void) => (
              <PointsGrantDialogContent onClose={onClose} />
            )}
            onClose={(grant) => {
              handleClose();
              doGrantPoints(grant, onUpdate);
            }}
          />
        )}
      </Menu>
    </div>
  );
}
