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
  hasDefinedOrg: number;
}

export default function RecruiterRegistration() {
  const [formData, setFormData] = useState<RecruiterRegistrationData>({
    name: '',
    email: '',
    companyName: '',
    position: '',
    hasDefinedOrg: 0,
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
  return (
    <MainLayout title="Register-Recruiter | VoLL-KI">
      <Container maxWidth="sm" sx={{ mt: 5 }}>
        <Box
          sx={{
            textAlign: 'center',
            border: '1px solid #ccc',
            borderRadius: 2,
            boxShadow: 3,
            p: 4,
          }}
        >
          <Typography variant="h5" gutterBottom>
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
            color="primary"
            fullWidth
            sx={{ mt: 3 }}
            onClick={handleSubmit}
          >
            Submit
          </Button>
        </Box>
        {isSubmitting && (
          <Box mt={2} display="flex" justifyContent="center">
            <CircularProgress color="primary" />
          </Box>
        )}
        <Dialog open={openDialog} onClose={handleCloseDialog}>
          <DialogTitle>Organization Exists – Invite Not Found</DialogTitle>
          <DialogContent>
            <p>
              Your organization is already registered(same email domain organization exists). Please
              contact the admin or recruiter to get an invite to join the organization.
            </p>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </MainLayout>
  );
}
