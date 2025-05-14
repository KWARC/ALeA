import { Box, Tab, Tabs } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { CommentSection } from './comment-section';
import { NotesView } from './notes-view';
import { FileLocation, PRIMARY_COL, SECONDARY_COL } from '@stex-react/utils';
import { getLocaleObject } from './lang/utils';
import { useRouter } from 'next/router';
import { TOCElem } from '@stex-react/api';

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
  file,
  selectedSectionTOC,
  defaultPrivate,
  selectedText = undefined,
  selectedElement = undefined,
  allNotesMode = false,
  extraPanel = undefined,
}: {
  file: FileLocation;
  selectedSectionTOC?: TOCElem;
  defaultPrivate: boolean;
  selectedText?: string;
  selectedElement?: any;
  allNotesMode?: boolean;
  extraPanel?: {
    label: any;
    panelContent: any;
  };
}) {
  const t = getLocaleObject(useRouter());
  const [value, setValue] = useState(extraPanel ? 2 : defaultPrivate ? 0 : 1);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };
  return (
    <Box>
      <Box>
        <Tabs
          value={value}
          onChange={handleChange}
          sx={{
            '& .MuiTab-root': {
              fontWeight: 'bold',
              ':hover': { background: '#DDD' },
              background: '#DDD',

              borderRadius: '10px 10px 0 0',
              borderBottom: `2px solid ${PRIMARY_COL}`,
              borderTop: `2px solid #AAA`,
              borderLeft: `2px solid #AAA`,
              borderRight: `2px solid #AAA`,
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#FFFFFF00 !important',
            },
            '& .Mui-selected': {
              background: 'white !important',
              borderTop: `2px solid ${PRIMARY_COL} !important`,
              borderLeft: `2px solid ${PRIMARY_COL} !important`,
              borderRight: `2px solid ${PRIMARY_COL} !important`,
              borderBottom: `2px solid white !important`,
            },
          }}
        >
          <Tab
            sx={{ flexGrow: '1' }}
            label={
              <Box display="flex" alignItems="center">
                <PersonIcon sx={{ fontSize: '28px' }} />
                <sup style={{ margin: '-5px 5px 0 -7px' }}>
                  <LockIcon sx={{ fontSize: '11px' }} />
                </sup>
                {t.myNotes}
              </Box>
            }
          />
          <Tab
            sx={{ flexGrow: '1' }}
            label={
              <Box display="flex" alignItems="center">
                <PublicIcon sx={{ mr: '5px' }} />
                {t.comments}
              </Box>
            }
          />
          {extraPanel && <Tab sx={{ flexGrow: '1' }} label={extraPanel.label} />}
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <NotesView
          file={file}
          selectedText={selectedText}
          selectedElement={selectedElement}
          allNotesMode={allNotesMode}
        />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <CommentSection
          file={file}
          selectedSectionTOC={selectedSectionTOC}
          selectedText={selectedText}
          selectedElement={selectedElement}
          allCommentsMode={allNotesMode}
        />
      </TabPanel>
      {extraPanel && (
        <TabPanel value={value} index={2}>
          {extraPanel.panelContent}
        </TabPanel>
      )}
    </Box>
  );
}
