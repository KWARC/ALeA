import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import TextsmsIcon from '@mui/icons-material/Textsms';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Box, Switch, Paper, Fade } from '@mui/material';
import { getUserInfo } from '@alea/spec';
import { FTML } from '@flexiformal/ftml';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { EditView } from './EditView';
import styles from './comments.module.scss';
import { getLocaleObject } from './lang/utils';
import { SelectedInfo } from './selected-info';

interface CommentReplyProps {
  uri?: FTML.Uri;
  isPrivateNote: boolean;
  parentId?: number;
  placeholder?: string;
  selectedText?: string;
  selectedElement?: any;
  hidden?: boolean;
  onCancel?: () => void;
  onUpdate: () => void;
}

export function CommentReply({
  uri,
  isPrivateNote,
  parentId = 0,
  placeholder = '',
  selectedText = undefined,
  selectedElement = undefined,
  hidden = false,
  onCancel,
  onUpdate,
}: CommentReplyProps) {
  const t = getLocaleObject(useRouter());
  const [name, setName] = useState<string | undefined>(undefined);

  useEffect(() => {
    getUserInfo().then((userInfo) => {
      setName(userInfo?.fullName);
    });
  }, []);

  const [postAnonymously, setPostAnonymously] = useState(false);

  const commentHeader = !isPrivateNote ? (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 2,
      }}
    >
      <Box>
        <Box
          sx={{
            fontSize: 15,
            fontWeight: 600,
            color: 'text.primary',
            lineHeight: 1.3,
          }}
        >
          {postAnonymously ? t.anonymous : name || 'Loading...'}
        </Box>
        <Box
          sx={{
            fontSize: 12,
            color: 'text.secondary',
            mt: 0.3,
          }}
        >
          {postAnonymously ? 'Your identity is hidden' : 'Posting as yourself'}
        </Box>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.8,
          borderRadius: 2,
          bgcolor: postAnonymously ? 'grey.100' : 'transparent',
          transition: 'all 0.2s ease',
        }}
      >
        <VisibilityOffIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Box sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary' }}>{t.hideIdentity}</Box>
        <Switch
          size="small"
          checked={postAnonymously}
          onChange={(e) => setPostAnonymously(e.target.checked)}
          sx={{
            ml: 0.5,
            '& .MuiSwitch-switchBase.Mui-checked': {
              color: 'primary.main',
            },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              bgcolor: 'primary.light',
            },
          }}
        />
      </Box>
    </Box>
  ) : null;

  return (
    <Fade in timeout={400}>
      <Paper
        elevation={0}
        sx={{
          display: hidden ? 'none' : 'block',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          p: 3,
          bgcolor: 'background.paper',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
          },
          '&:hover': {
            borderColor: 'rgba(102, 126, 234, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          },
          '&:focus-within': {
            borderColor: '#667eea',
            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.12)',
          },
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 2.5,
              flexShrink: 0,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              boxShadow: '0 4px 16px rgba(102, 126, 234, 0.25)',
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              },
            }}
          >
            {isPrivateNote ? (
              <TextSnippetIcon sx={{ fontSize: 26 }} />
            ) : (
              <TextsmsIcon sx={{ fontSize: 26 }} />
            )}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {commentHeader}
            {selectedText && (
              <Box sx={{ mb: 2 }}>
                <SelectedInfo text={selectedText} />
              </Box>
            )}

            <Box
              sx={{
                '& .MuiTextField-root': {
                  '& .MuiOutlinedInput-root': {
                    fontSize: 15,
                    lineHeight: 1.6,
                    '& fieldset': {
                      borderColor: 'divider',
                      borderRadius: 2,
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(102, 126, 234, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiInputBase-input': {
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: 'text.primary',
                    '&::placeholder': {
                      color: 'text.secondary',
                      opacity: 0.7,
                    },
                  },
                },
                '& .MuiButton-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 14,
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  boxShadow: 'none',
                  '&:hover': {
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  },
                },
              }}
            >
              <EditView
                parentId={parentId}
                uri={uri}
                isPrivateNote={isPrivateNote}
                postAnonymously={postAnonymously}
                selectedText={selectedText}
                placeholder={placeholder}
                onCancel={onCancel}
                onUpdate={onUpdate}
              />
            </Box>
          </Box>
        </Box>
      </Paper>
    </Fade>
  );
}
