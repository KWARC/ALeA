import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { getRecruiterProfile, registerRecruiter } from '@alea/spec';
import { isBusinessDomain } from '@alea/utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import MainLayout from '../../../layouts/MainLayout';
export interface RecruiterRegistrationData {
  name: string;
  email: string;
  companyName: string;
  position: string;
}

export default function RecruiterRegistration() {
  const [formData, setFormData] = useState<RecruiterRegistrationData>({
    name: '',
    email: '',
    companyName: '',
    position: '',
  });
  const [errors, setErrors] = useState({ email: '' });
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const fetchRecruiterData = async () => {
      try {
        const res = await getRecruiterProfile();
        if (!res || (Array.isArray(res) && res.length === 0)) {
          setIsRegistered(false);
          return;
        }
        setIsRegistered(true);
      } catch (error) {
        console.error('Error fetching recruiter data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecruiterData();
  }, []);

  if (loading) {
    return <CircularProgress color="primary" />;
  }
  if (isRegistered) return <Alert severity="info">You are already registered.</Alert>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'email') {
      setErrors((prevErrors) => ({
        ...prevErrors,
        email: '',
      }));
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;

    if (!email) {
      setErrors((prevErrors) => ({ ...prevErrors, email: 'Email is required.' }));
      return false;
    } else if (!emailRegex.test(email)) {
      setErrors((prevErrors) => ({ ...prevErrors, email: 'Invalid email address.' }));
      return false;
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (!isBusinessDomain(domain)) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        email: `Please use a valid business email (not a public domain like ${domain}).`,
      }));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateEmail(formData.email)) return;
    setIsSubmitting(true);
    try {
      const { name, email, position, companyName } = formData;
      const data = await registerRecruiter(name, email, position, companyName);
      if (data?.showInviteDialog) {
        setOpenDialog(true);
        return;
      }
      if (data?.showProfilePopup) {
        await router.push({
          pathname: '/job-portal/recruiter/dashboard',
          query: { showProfilePopup: 'true' },
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  return (<MainLayout title="Register-Recruiter | VoLL-KI">
  <Container maxWidth="sm" sx={{ mt: 6 }}>
    <Box
      sx={{
        textAlign: 'center',
        borderRadius: 3,
        p: 5,
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        border: '1px solid rgba(74,105,225,0.3)',
        position: 'relative',
      }}
    >
      <Typography
        variant="h4"
        fontWeight="bold"
        gutterBottom
        color="#4A69E1"
        sx={{ mb: 4 }}
      >
        Recruiter Registration
      </Typography>

      <TextField
        label="Full Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        type="email"
        fullWidth
        margin="normal"
        error={!!errors.email}
        helperText={errors.email}
      />
      <TextField
        label="Organization Name"
        name="companyName"
        value={formData.companyName}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Position"
        name="position"
        value={formData.position}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />

      <Button
        variant="contained"
        fullWidth
        sx={{
          mt: 4,
          bgcolor: '#4A69E1',
          textTransform: 'none',
          fontWeight: 600,
          py: 1.5,
          fontSize: '16px',
          '&:hover': {
            bgcolor: '#233ba4ff',
          },
        }}
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Submit'}
      </Button>
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Organization Exists – Invite Not Found</DialogTitle>
        <DialogContent>
          <Typography>
            Your organization is already registered (same email domain organization exists). Please
            contact the admin or recruiter to get an invite to join the organization.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  </Container>
</MainLayout>
  );
}
