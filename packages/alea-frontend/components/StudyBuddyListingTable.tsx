import { Box, Divider, IconButton, List, ListItem, Paper, Typography } from '@mui/material';
import { StudyBuddy } from '@stex-react/spec';
import { Fragment } from 'react';
import { getLocaleObject } from '../lang/utils';
import { useRouter } from 'next/router';

export function StudyBuddyListing({
  studyBuddy,
  actionIcon,
  onAction,
}: {
  studyBuddy: StudyBuddy;
  actionIcon?: React.ReactNode;
  onAction?: (buddy: StudyBuddy) => void;
}) {
  const { studyBuddy: t } = getLocaleObject(useRouter());
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
            <span style={{ color: 'gray' }}>{t.dayPreference}:</span>
            <span>{studyBuddy.dayPreference}</span>
          </Box>
          <Box display="flex" justifyContent="space-between" gap="5px">
            <span style={{ color: 'gray' }}>{t.languages}:</span>
            <span>{studyBuddy.languages}</span>
          </Box>{' '}
          <Box display="flex" justifyContent="space-between" gap="5px">
            <span style={{ color: 'gray' }}>{t.meetPreference}:</span>
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
  actionIcon,
  onAction,
}: {
  studyBuddies: StudyBuddy[];
  header: string;
  subText?: string;
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
