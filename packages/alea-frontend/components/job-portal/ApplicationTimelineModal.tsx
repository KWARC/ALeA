import { useEffect, useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import { getJobApplicationTimeline, JobApplicationTimelineEntry } from '@alea/spec';

const actionLabelMap: Record<string, string> = {
  CREATE_APPLICATION: 'Application Submitted',
  WITHDRAW_APPLICATION: 'Application Withdrawn',
  SHORTLIST_FOR_INTERVIEW: 'Shortlisted for Interview',
  ON_HOLD: 'Kept on Hold',
  REJECT: 'Application Rejected',
  SEND_OFFER: 'Offer Sent',
  ACCEPT_OFFER: 'Offer Accepted',
  REJECT_OFFER: 'Offer Rejected',
  REVOKE_OFFER: 'Offer Revoked',
};

export function JobApplicationTimeline({
  timelineEntries,
}: {
  timelineEntries: JobApplicationTimelineEntry[];
}) {
  return (
    <Timeline>
      {timelineEntries.map((entry, index) => (
        <TimelineItem key={entry.id}>
          <TimelineSeparator>
            <TimelineDot color="primary" />
            {index < timelineEntries.length - 1 && <TimelineConnector />}
          </TimelineSeparator>

          <TimelineContent>
            <Box>
              <Typography fontWeight={600}>
                {actionLabelMap[entry.actionType] ?? entry.actionType}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Action by {entry.actionByRole} • {new Date(entry.createdAt).toLocaleString()}
              </Typography>
              {entry.message && (
                <Typography variant="body2" mt={0.5}>
                  “{entry.message}”
                </Typography>
              )}
            </Box>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
}

const JobApplicationTimelineModal= ({
  open,
  applicationId,
  onClose,
}:{
  open: boolean;
  applicationId: number;
  onClose: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [timelineEntries, setTimelineEntries] = useState<JobApplicationTimelineEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const fetchTimeline = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getJobApplicationTimeline(applicationId);
        setTimelineEntries(result || []);
      } catch (err) {
        setError('Failed to fetch timeline.');
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [open, applicationId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Application Timeline
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}

        {!loading && !error && timelineEntries.length === 0 && (
          <Typography variant="body2">No timeline entries found.</Typography>
        )}

        {!loading && !error && timelineEntries.length > 0 && (
          <JobApplicationTimeline timelineEntries={timelineEntries} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default JobApplicationTimelineModal;
