import { Box, Divider, IconButton, List, ListItem, Paper, Typography } from '@mui/material';
import { StudyBuddy } from '@alea/spec';
import { Fragment } from 'react';
import { defaultStudyBuddyLabels, type StudyBuddyLabels } from './labels';

export function StudyBuddyListing({
  studyBuddy,
  labels = defaultStudyBuddyLabels,
  actionIcon,
  onAction,
}: {
  studyBuddy: StudyBuddy;
  labels?: StudyBuddyLabels;
  actionIcon?: React.ReactNode;
  onAction?: (buddy: StudyBuddy) => void;
}) {
  return (
    <Box display="flex">
      <Box
        display="flex"
        justifyContent="space-between"
        gap="0 20px"
        flexWrap="wrap"
        flex="1 1 100px"
      >
        <Box sx={{ flex: '1 0 200px' }}>
          <Box>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{studyBuddy.userName}</span>
            {studyBuddy.email && <b>,&nbsp;{studyBuddy.email}</b>}
          </Box>
          <Box>
            <span style={{ color: '#555' }}>
              {studyBuddy.studyProgram}, semester {studyBuddy.semester}
            </span>
          </Box>
          {studyBuddy.intro}
        </Box>
        <Box sx={{ flex: '1 0 200px', maxWidth: '275px' }}>
          <Box display="flex" justifyContent="space-between" gap="5px">
            <span style={{ color: 'gray' }}>{labels.dayPreference}:</span>
            <span>{studyBuddy.dayPreference}</span>
          </Box>
          <Box display="flex" justifyContent="space-between" gap="5px">
            <span style={{ color: 'gray' }}>{labels.languages}:</span>
            <span>{studyBuddy.languages}</span>
          </Box>{' '}
          <Box display="flex" justifyContent="space-between" gap="5px">
            <span style={{ color: 'gray' }}>{labels.meetPreference}:</span>
            <span>{studyBuddy.meetType}</span>
          </Box>
        </Box>
      </Box>
      {actionIcon && (
        <IconButton
          sx={{ flex: '0 0 40px' }}
          onClick={() => {
            if (onAction) onAction(studyBuddy);
          }}
        >
          {actionIcon}
        </IconButton>
      )}
    </Box>
  );
}

export function StudyBuddyListingTable({
  studyBuddies,
  header,
  subText = '',
  labels = defaultStudyBuddyLabels,
  actionIcon,
  onAction,
}: {
  studyBuddies?: StudyBuddy[];
  header: string;
  subText?: string;
  labels?: StudyBuddyLabels;
  actionIcon?: React.ReactNode;
  onAction?: (buddy: StudyBuddy) => void;
}) {
  if (!studyBuddies?.length) return null;
  return (
    <Box mt="30px">
      <Typography variant="h4">{header}</Typography>
      <Typography variant="subtitle1" sx={{ color: '#666' }}>
        {subText}
      </Typography>
      <Paper>
        <List>
          {studyBuddies.map((studyBuddy, idx) => (
            <Fragment key={studyBuddy.userId}>
              <ListItem sx={{ display: 'flex' }}>
                <Box flex="1">
                  <StudyBuddyListing
                    studyBuddy={studyBuddy}
                    labels={labels}
                    actionIcon={actionIcon}
                    onAction={onAction}
                  />
                </Box>
              </ListItem>
              {idx !== studyBuddies.length - 1 && <Divider component="li" />}
            </Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
}
