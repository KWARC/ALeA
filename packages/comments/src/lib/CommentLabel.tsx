import ReplyIcon from '@mui/icons-material/Reply';
import ShieldTwoToneIcon from '@mui/icons-material/ShieldTwoTone';
import { Box, Button, Tooltip } from '@mui/material';
import {
  canModerateComment,
  Comment,
  getUserInfo,
  isHiddenNotSpam,
  isSpam,
  pointsToLevel,
} from '@alea/spec';
import { DateView } from '@alea/react-utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { CommentMenu } from './CommentMenu';
import styles from './comments.module.scss';
import { getLocaleObject } from './lang/utils';

const NUM_LEVELS = 6;

export function LevelIcon({
  totalPoints,
  newPoints,
}: {
  totalPoints?: number;
  newPoints?: number;
}) {
  if (!totalPoints) return null;
  const level = pointsToLevel(totalPoints);
  const hue = (360 / NUM_LEVELS) * ((level + 1) % NUM_LEVELS);
  const color = `hsl(${hue}deg 100% 30%)`;
  const hoverColor = `hsl(${hue}deg 42% 79%)`;
  return (
    <Tooltip
      title={
        <Box fontSize="medium">
          {!!newPoints && (
            <>
              Gained <b>+{newPoints}</b>&nbsp;
            </>
          )}
          Total karma: <b style={{ color: hoverColor }}>{totalPoints}</b>
        </Box>
      }
    >
      <span style={{ display: 'inline-flex' }}>
        <ShieldTwoToneIcon sx={{ color }} />
        <span
          style={{
            color,
            fontSize: '13px',
            position: 'absolute',
            top: '2px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'max-content',
          }}
        >
          {level}
        </span>
      </span>
    </Tooltip>
  );
}
export function CommentLabel({
  comment,
  setEditingComment,
  setOpenReply,
  onUpdate,
}: {
  comment: Comment;
  setEditingComment: (editing: boolean) => void;
  setOpenReply: (open: boolean) => void;
  onUpdate: () => void;
}) {
  const [fromCurrentUser, setFromCurrentUser] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const t = getLocaleObject(useRouter());
  const isPrivateNote = !!comment?.isPrivate;

  const hiddenStatus = comment?.hiddenStatus;
  const showHiddenStatus =
    !isPrivateNote && (isSpam(hiddenStatus) || isHiddenNotSpam(hiddenStatus));
  const statusStyle = isSpam(hiddenStatus) ? 'spam_status' : 'hidden_status';

  useEffect(() => {
    getUserInfo().then(
      (userInfo) => {
        const userId = userInfo?.userId;
        const isLoggedIn = !!userId;
        setIsLoggedIn(isLoggedIn);
        setFromCurrentUser(isLoggedIn && userId === comment?.userId);
      },
      () => setFromCurrentUser(false)
    );
    canModerateComment(comment.courseId, comment.courseTerm).then(setCanModerate);
  }, [comment?.userId]);

  if (comment.isDeleted) return <i className={styles['deleted_message']}>{t.wasDeleted}</i>;

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      onClick={(e) => e.stopPropagation()}
    >
      <Box display="flex" alignItems="center">
        {/*comment.commentId*/}
        {!isPrivateNote && (
          <>
            <span className={styles['user_link']}>
              {comment.isAnonymous ? <i>Anonymous</i> : comment.userName}
            </span>
            <LevelIcon totalPoints={comment.totalPoints} newPoints={comment.pointsGranted} />
            &nbsp;
          </>
        )}
        <DateView timestampMs={(comment.postedTimestampSec || 0) * 1000} />
        {comment.isEdited && (
          <span style={{ display: 'inline', fontSize: '12px', color: 'grey' }}>
            &nbsp;&#x2022; {t.edited}
          </span>
        )}
        {isLoggedIn && !isPrivateNote && (
          <>
            &nbsp; &nbsp;
            <Button onClick={() => setOpenReply(true)} size="small" sx={{ p: '0' }}>
              <ReplyIcon />
              &nbsp;{t.reply}
            </Button>
          </>
        )}
        {showHiddenStatus && (
          <Tooltip title={comment.hiddenJustification}>
            <span className={styles[statusStyle]}>{hiddenStatus}</span>
          </Tooltip>
        )}
      </Box>
      <Box>
        {(canModerate || fromCurrentUser) && (
          <CommentMenu
            comment={comment}
            canModerate={canModerate}
            canEditComment={fromCurrentUser}
            setEditingComment={setEditingComment}
            onUpdate={onUpdate}
          />
        )}
      </Box>
    </Box>
  );
}
