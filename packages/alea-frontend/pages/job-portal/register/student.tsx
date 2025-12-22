import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  TextField,
  Typography,
} from '@mui/material';
import {
  canAccessResource,
  createStudentProfile,
  CreateStudentProfileData,
  getStudentProfile,
} from '@alea/spec';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import MainLayout from '../../../layouts/MainLayout';

export default function StudentRegistration() {
  const router = useRouter();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateStudentProfileData>({
    name: '',
    resumeUrl: '',
    email: '',
    mobile: '',
    altMobile: '',
    programme: '',
    yearOfAdmission: '',
    yearOfGraduation: '',
    location: '',
    courses: '',
    gpa: '',
    about: '',
  });
  const [errors, setErrors] = useState({
    email: '',
    mobile: '',
    altMobile: '',
  });
  const [loading, setLoading] = useState(false);
  const [accessCheckLoading, setAccessCheckLoading] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      setAccessCheckLoading(true);
      const hasAccess = await canAccessResource(ResourceName.JOB_PORTAL, Action.APPLY, {
        instanceId: CURRENT_TERM,
      });
      if (!hasAccess) {
        alert('You donot have access to this page.');
        router.push('/job-portal');
        return;
      }
      setAccessCheckLoading(false);
    };

    checkAccess();
  }, []);

  useEffect(() => {
    setLoading(true);
    if (accessCheckLoading) return;
    const fetchStudentData = async () => {
      try {
        const res = await getStudentProfile();
        if (!res || (Array.isArray(res) && res.length === 0)) {
          setIsRegistered(false);
          return;
        }
        setIsRegistered(true);
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, [accessCheckLoading]);

  if (accessCheckLoading || loading) {
    return <CircularProgress color="primary" />;
  }
  if (isRegistered) {
    return <Alert severity="info">You are already registered.</Alert>;
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: '',
    }));

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const validateFields = () => {
    const newErrors = { email: '', mobile: '', altMobile: '' };

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.mobile || !/^\d{10,15}$/.test(formData.mobile)) {
      newErrors.mobile = 'Please enter a valid contact number (10-15 digits).';
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.mobile;
  };

  const handleSubmit = async () => {
    if (!validateFields()) return;
    try {
      setIsSubmitting(true);
      await createStudentProfile(formData);
      router.push('/job-portal/student/dashboard');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout title="Register-Student | VoLL-KI">
      <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
        <Box
          sx={{
            position: 'relative',
            p: { xs: 3, md: 4 },
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(14px)',
            boxShadow: '0 20px 50px rgba(74,105,225,0.18)',
            border: '1px solid rgba(74,105,225,0.25)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: 6,
              background: 'linear-gradient(90deg, #4A69E1, #6f86ff)',
            }}
          />

          <Typography
            variant="h5"
            fontWeight={700}
            textAlign="center"
            color="#4A69E1"
            sx={{ mb: 1, mt: 1 }}
          >
            Student Registration
          </Typography>

          <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ mb: 4 }}>
            Create your student profile to apply for jobs and internships
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
            <TextField
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              type="email"
              error={!!errors.email}
              helperText={errors.email}
            />
            <TextField
              label="Mobile Number"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              type="tel"
              error={!!errors.mobile}
              helperText={errors.mobile}
            />
            <TextField
              label="Alternate Mobile Number"
              name="altMobile"
              value={formData.altMobile}
              onChange={handleChange}
              type="tel"
              error={!!errors.altMobile}
              helperText={errors.altMobile}
            />
            <TextField
              label="Programme"
              name="programme"
              value={formData.programme}
              onChange={handleChange}
            />
            <TextField
              label="Courses"
              name="courses"
              value={formData.courses}
              onChange={handleChange}
              multiline
              rows={2}
              placeholder="Enter courses separated by commas"
            />
            <TextField
              label="GPA"
              name="gpa"
              value={formData.gpa}
              onChange={handleChange}
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Year of Admission"
                name="yearOfAdmission"
                value={formData.yearOfAdmission}
                onChange={handleChange}
                type="number"
                fullWidth
              />
              <TextField
                label="Year of Graduation"
                name="yearOfGraduation"
                value={formData.yearOfGraduation}
                onChange={handleChange}
                type="number"
                fullWidth
              />
            </Box>

            <TextField
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
            />
            <TextField
              label="About Yourself"
              name="about"
              value={formData.about}
              onChange={handleChange}
              multiline
              rows={3}
            />
            <TextField
              label="Resume URL"
              name="resumeUrl"
              value={formData.resumeUrl}
              onChange={handleChange}
            />
            <Button
              variant="contained"
              fullWidth
              disabled={isSubmitting}
              sx={{
                mt: 2,
                py: 1.2,
                borderRadius: '14px',
                fontWeight: 600,
                textTransform: 'none',
                background: 'linear-gradient(135deg, #4A69E1, #6f86ff)',
                boxShadow: '0 10px 30px rgba(74,105,225,0.35)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #3a56c8, #5f75ff)',
                },
              }}
              onClick={handleSubmit}
            >
              {isSubmitting ? <CircularProgress size={22} /> : 'Complete Registration'}{' '}
            </Button>
          </Box>
        </Box>
      </Container>
    </MainLayout>
  );
}
