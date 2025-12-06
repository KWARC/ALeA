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
  getStudentProfile,
  StudentData,
} from '@alea/spec';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import MainLayout from '../../../layouts/MainLayout';

export default function StudentRegistration() {
  const router = useRouter();
  const [isRegistered, setIsRegistered] = useState(false);
  const [formData, setFormData] = useState<StudentData>({
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
    userId: '',
  });
  const [errors, setErrors] = useState({
    email: '',
    mobile: '',
    altMobile: '',
  });
  const [loading, setLoading] = useState(false);
  const [accessCheckLoading, setAccessCheckLoading] = useState(true);

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
        console.error('Error fetching recruiter data:', error);
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
    await createStudentProfile(formData);
    router.push('/job-portal/student/dashboard');
  };

  return (
    <MainLayout title="Register-Student | VoLL-KI">
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
            Student Registration
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
            label="Mobile Number"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            type="tel"
            fullWidth
            margin="normal"
            error={!!errors.mobile}
            helperText={errors.mobile}
          />
          <TextField
            label="Alternate Mobile Number"
            name="altMobile"
            value={formData.altMobile}
            onChange={handleChange}
            type="tel"
            fullWidth
            margin="normal"
            error={!!errors.altMobile}
            helperText={errors.altMobile}
          />
          <TextField
            label="Programme"
            name="programme"
            value={formData.programme}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Courses"
            name="courses"
            value={formData.courses}
            onChange={handleChange}
            multiline
            rows={3}
            fullWidth
            margin="normal"
            placeholder="Enter your courses separated by commas"
          />
          <TextField
            label="GPA"
            name="gpa"
            value={formData.gpa}
            onChange={handleChange}
            multiline
            rows={2}
            fullWidth
            margin="normal"
            placeholder="Enter Your GPA "
          />
          <TextField
            label="Year of Admission"
            name="yearOfAdmission"
            value={formData.yearOfAdmission}
            onChange={handleChange}
            type="number"
            fullWidth
            margin="normal"
          />

          <TextField
            label="Year of Graduation"
            name="yearOfGraduation"
            value={formData.yearOfGraduation}
            onChange={handleChange}
            type="number"
            fullWidth
            margin="normal"
          />

          <TextField
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            multiline
            rows={2}
            fullWidth
            margin="normal"
          />
          <TextField
            label="About Yourself"
            name="about"
            value={formData.about}
            onChange={handleChange}
            multiline
            rows={4}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Resume URL"
            name="resumeUrl"
            value={formData.resumeUrl}
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
      </Container>
    </MainLayout>
  );
}
