import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import PublicIcon from '@mui/icons-material/Public';
import { Box, Tab, Tabs } from '@mui/material';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { CommentSection } from './comment-section';
import { getLocaleObject } from './lang/utils';
import { NotesView } from './notes-view';
import { FTML } from '@flexiformal/ftml';

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && (
        <Box p="0 15px 0">
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

export function CommentNoteToggleView({
  uri,
  defaultPrivate,
  selectedText = undefined,
  selectedElement = undefined,
  allNotesMode = false,
}: {
  uri: FTML.Uri;
  defaultPrivate: boolean;
  selectedText?: string;
  selectedElement?: any;
  allNotesMode?: boolean;
}) {
  const t = getLocaleObject(useRouter());
  const [value, setValue] = useState(defaultPrivate ? 0 : 1);
  const PRIMARY_COL = '#203360'; //TODO: out of alea project
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };
  return (
    <Box>
      <Box>
<Tabs
  value={value}
  onChange={handleChange}
  variant="fullWidth"
  sx={(theme) => {
    const isDark = theme.palette.mode === 'dark';

    return {
      backgroundColor: theme.palette.background.paper,
      borderRadius: '10px 10px 0 0',
      border: `1px solid ${theme.palette.divider}`,
      borderBottom: `2px solid ${theme.palette.primary.main}`,

      '& .MuiTabs-indicator': {
        display: 'none', // cleaner than transparent hack
      },

      '& .MuiTab-root': {
        fontWeight: 600,
        color: theme.palette.text.secondary,
        textTransform: 'none',
        minHeight: 48,

        '&:hover': {
          backgroundColor: theme.palette.action.hover,
        },
      },

      '& .MuiTab-root.Mui-selected': {
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.background.default,
        borderTop: `2px solid ${theme.palette.primary.main}`,
        borderLeft: `2px solid ${theme.palette.primary.main}`,
        borderRight: `2px solid ${theme.palette.primary.main}`,
        borderBottom: `2px solid ${theme.palette.background.default}`,
        borderRadius: '10px 10px 0 0',
      },
    };
  }}
>

  <Tab
  sx={{ flexGrow: 1 }}
  label={
    <Box display="flex" alignItems="center">
      <PersonIcon sx={{ fontSize: 22 }} />
      <sup style={{ margin: '-5px 6px 0 -6px' }}>
        <LockIcon sx={{ fontSize: 11 }} />
      </sup>
      {t.myNotes}
    </Box>
  }
/>

<Tab
  sx={{ flexGrow: 1 }}
  label={
    <Box display="flex" alignItems="center">
      <PublicIcon sx={{ mr: 0.5 }} />
      {t.comments}
    </Box>
  }
/>

        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <NotesView
          uri={uri}
          selectedText={selectedText}
          selectedElement={selectedElement}
          allNotesMode={allNotesMode}
        />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <CommentSection
          uri={uri}
          selectedText={selectedText}
          selectedElement={selectedElement}
          allCommentsMode={allNotesMode}
        />
      </TabPanel>
    </Box>
  );
}
