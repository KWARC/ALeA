import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import {
  canAccessResource,
  getRecruiterProfile,
  inviteRecruiterToOrg,
  RecruiterData,
} from '@stex-react/api';
import { Action, ResourceName } from '@stex-react/utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import JpLayoutWithSidebar from '../../../layouts/JpLayoutWithSidebar';

const InviteRecruiterPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [recruiter, setRecruiter] = useState<RecruiterData>(null);
  const [accessCheckLoading, setAccessCheckLoading] = useState(true);
  const [snackOpen, setSnackOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      setAccessCheckLoading(true);
      const recruiter = await getRecruiterProfile();
      setRecruiter(recruiter);
      const orgId = recruiter?.organizationId;
      const hasAccess = await canAccessResource(
        ResourceName.JOB_PORTAL_ORG,
        Action.MANAGE_JOB_POSTS,
        { orgId: String(orgId) }
      );
      if (!hasAccess) {
        alert('You donot have access to this page.');
        router.push('/job-portal');
        return;
      }
      setAccessCheckLoading(false);
    };

    checkAccess();
  }, []);
  const handleInvite = async () => {
    if (!email) return;

    try {
      setLoading(true);
      const isSuccess = await inviteRecruiterToOrg(email, recruiter.organizationId);
      if (isSuccess) {
        setSnackOpen(true);
        setEmail('');
      }
    } catch (error) {
      console.error('Invite failed:', error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) return <CircularProgress />;
  return (
    <Box
      sx={{
        maxWidth: '600px',
        margin: 'auto',
        mt: 8,
        textAlign: 'center',
        p: { xs: '30px 16px', md: '30px' },
      }}
    >
      <Card
        sx={{
          borderRadius: '20px',
          backgroundColor: '#f5f7fa',
          boxShadow: 3,
          p: { xs: 1, md: 4 },
        }}
      >
        <CardContent>
          <Typography variant="h5" fontWeight="bold" mb={2}>
            Invite Colleague
          </Typography>
          <Typography variant="body1" mb={4} color="text.secondary">
            Send an invitation to join your organization. Just enter their email address below.
          </Typography>

          <TextField
            variant="outlined"
            fullWidth
            placeholder="Enter recruiter's email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Button
            variant="contained"
            fullWidth
            onClick={handleInvite}
            disabled={loading || !email}
            sx={{ py: 1.5, fontWeight: 'bold' }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Invite'}
          </Button>
        </CardContent>
      </Card>

      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        message="Invite sent successfully!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

const InviteRecruiter = () => {
  return <JpLayoutWithSidebar role="recruiter">{<InviteRecruiterPage />}</JpLayoutWithSidebar>;
};

export default InviteRecruiter;
