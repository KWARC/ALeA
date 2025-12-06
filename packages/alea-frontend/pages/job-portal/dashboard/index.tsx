import AssignmentIcon from '@mui/icons-material/Assignment';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BusinessIcon from '@mui/icons-material/Business';
import CancelIcon from '@mui/icons-material/Cancel';
import ChatIcon from '@mui/icons-material/Chat';
import EmojiPeopleIcon from '@mui/icons-material/EmojiPeople';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WorkIcon from '@mui/icons-material/Work';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Grid,
  Icon,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { canAccessResource, getStudentProfile, StudentData } from '@alea/spec';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Chart } from 'react-google-charts';
import JpLayoutWithSidebar from '../../../layouts/JpLayoutWithSidebar';
import Applications from './application';
import StudentProfile from './profile';

const recruiterData = [
  ['Category', 'Count'],
  ['Applicants', 25],
  ['Shortlisted', 10],
  ['On Hold', 5],
  ['Interviewed', 8],
  ['Offers', 2],
];

const studentData = [
  ['Day', 'Activities'],
  ['Mon', 20],
  ['Tue', 30],
  ['Wed', 40],
  ['Thu', 50],
  ['Fri', 60],
];
const colors = ['#1CD083', '#5A69E2', '#48A9F8', '#8BC741'];
const icons = [
  <EmojiPeopleIcon sx={{ fontSize: '60px' }} />,
  <AssignmentIcon sx={{ fontSize: '60px' }} />,
  <CancelIcon sx={{ fontSize: '60px' }} />,
  <ChatIcon sx={{ fontSize: '60px' }} />,
];
const getRandomStudentProfile = () => {
  const names = ['John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Brown'];
  const randomName = names[Math.floor(Math.random() * names.length)];

  return {
    name: 'fakejoy',
    email: 'fakejoy@gmail.com',
    mobile: '+49 163 555 1584',
    programme: 'Artificial Intelligence',
    yearOfAdmission: '2024',
    yearOfGraduation: '2026',
    grades: 'A',
    resumeURL: 'http://example.com/resume',
    about: 'A motivated AI developer with a passion for research in generative AI.',
  };
};

const selectedStudentProfile = getRandomStudentProfile();

export function StudentDashboard() {
  const [filters, setFilters] = useState({
    sent: true,
    interviewed: true,
    rejected: true,
    dateRange: '',
  });
  const [accessCheckLoading, setAccessCheckLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentData>(null);
  const router = useRouter();
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
    if (accessCheckLoading) return;
    const fetchStudentData = async () => {
      try {
        setLoading(true);

        const res = await getStudentProfile();
        setStudent(res[0]);
        // setFormData(res[0]);
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, [accessCheckLoading]);

  const handleFilterChange = (event) => {
    setFilters({ ...filters, [event.target.name]: event.target.checked });
  };

  const handleDateChange = (event) => {
    setFilters({ ...filters, dateRange: event.target.value });
  };
  // const {
  //   name,
  //   resumeURL,
  //   email,
  //   mobile,
  //   programme,
  //   yearOfAdmission,
  //   yearOfGraduation,
  //   courses,
  //   grades,
  //   about,
  // } = student;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Grid container spacing={2} sx={{ p: '70px 20px 20px 20px' }}>
        {['Interviews', 'Applied', 'Rejected', 'Messages'].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={stat}>
            <Card
              sx={{
                bgcolor: colors[index],
                p: 3,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: '15px',
                boxShadow: 3,
                height: '200px',
              }}
            >
              <Icon
                sx={{
                  fontSize: 80,
                  mr: 10,
                  color: 'white',
                  border: '1px solid #fff',
                  borderRadius: '15px',
                  pb: '20px',
                }}
              >
                {icons[index]}
              </Icon>{' '}
              <Box sx={{ flexGrow: 1 }}>
                <Typography
                  variant="h6"
                  sx={{ color: '#FFFFFF', fontWeight: '500', fontSize: '1.5rem' }}
                >
                  {stat}
                </Typography>
                <Typography variant="h3" sx={{ color: '#FFFFFF', fontWeight: '600' }}>
                  {Math.floor(Math.random() * 100) % 10}
                </Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', flexGrow: 1, p: 2 }}>
        <Card
          elevation={3}
          sx={{
            flex: '1 1 1%',
            padding: 4,
            borderRadius: 3,
            backgroundColor: '#f9f9f9',
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} sx={{ textAlign: 'center', marginBottom: 3 }}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  margin: '0 auto',
                  backgroundColor: 'primary.main',
                  color: 'white',
                  fontSize: 32,
                }}
              >
                {selectedStudentProfile.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h6" sx={{ marginTop: 2, fontWeight: 'bold' }}>
                {selectedStudentProfile.name}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Email
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedStudentProfile.email}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Contact No
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedStudentProfile.mobile}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Programme
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedStudentProfile.programme}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Year of Admission
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedStudentProfile.yearOfAdmission}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Year of Graduation
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedStudentProfile.yearOfGraduation}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Grades
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedStudentProfile.grades}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Resume URL
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedStudentProfile.resumeURL}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                About
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedStudentProfile.about}
              </Typography>
            </Grid>
          </Grid>
        </Card>

        <Box sx={{ flex: '2', ml: 2, flexDirection: 'column' }}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <FormControlLabel
              control={
                <Checkbox checked={filters.sent} onChange={handleFilterChange} name="sent" />
              }
              label="Application Sent"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.interviewed}
                  onChange={handleFilterChange}
                  name="interviewed"
                />
              }
              label="Interviewed"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.rejected}
                  onChange={handleFilterChange}
                  name="rejected"
                />
              }
              label="Rejected"
            />
            <TextField
              type="date"
              variant="outlined"
              size="small"
              onChange={handleDateChange}
              sx={{ minWidth: '180px' }}
            />
          </Box>
          <Chart
            chartType="BarChart"
            width="100%"
            height="300px"
            data={studentData}
            options={{
              title: 'Application Status',
              backgroundColor: '#f9f9f9',
              legend: { position: 'bottom' },
            }}
          />
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Recommended Jobs</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <TextField
                variant="outlined"
                size="small"
                placeholder="Filter by job title..."
                sx={{ flexGrow: 1, mr: 2 }}
              />
              <TextField
                variant="outlined"
                size="small"
                placeholder="Filter by company..."
                sx={{ flexGrow: 1 }}
              />
            </Box>
            <Grid container spacing={2}>
              {[...Array(3)].map((_, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card sx={{ borderRadius: '15px', boxShadow: 3, p: 2, maxWidth: 350 }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1}>
                        <WorkIcon color="primary" />
                        <Typography variant="h6" fontWeight="bold">
                          SWE
                        </Typography>
                      </Box>

                      <Box display="flex" alignItems="center" gap={1} mt={1}>
                        <BusinessIcon color="secondary" />
                        <Typography variant="body1">Nike</Typography>
                      </Box>

                      <Box display="flex" alignItems="center" gap={1} mt={1}>
                        <LocationOnIcon color="action" />
                        <Typography variant="body2">Berlin</Typography>
                      </Box>

                      <Box display="flex" alignItems="center" gap={1} mt={1}>
                        <AttachMoneyIcon color="success" />
                        <Typography variant="body2">10,000 Euro</Typography>
                      </Box>

                      <Box display="flex" alignItems="center" gap={1} mt={1}>
                        <EventIcon color="error" />
                        <Typography variant="body2">Deadline: 24/06/2025</Typography>
                      </Box>

                      <Box mt={2}>
                        <Button variant="contained" color="primary" fullWidth>
                          More Details
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

const RecruiterDashboard = () => (
  <Box sx={{ height: '100vh' }}>
    <Typography variant="h4"> Dashboard</Typography>
    <Card>
      <CardContent>
        <Typography variant="h6"> Overview</Typography>
        <Chart
          chartType="PieChart"
          width="100%"
          height="300px"
          data={recruiterData}
          options={{ title: 'Recruiter Metrics' }}
        />
      </CardContent>
    </Card>
  </Box>
);

const News = () => (
  <Box>
    <Typography variant="h4">News</Typography>
    <AppBar position="static" sx={{ bgcolor: '#8d9eb0' }}>
      <Toolbar>
        <Typography variant="h6">Centered AppBar</Typography>
      </Toolbar>
    </AppBar>
    <Box>
      {[...Array(50)].map((_, index) => (
        <Typography key={index}>News Content {index + 1}</Typography>
      ))}
    </Box>
  </Box>
);

const Messages = () => (
  <Box sx={{ height: '100vh' }}>
    <Typography variant="h4"> Messages</Typography>
  </Box>
);

const Dashboard = () => {
  const [role, setRole] = useState('student');

  const getDashboardContent = () => {
    switch (role) {
      case 'dashboard':
        return <StudentDashboard />;

      case 'applications':
        return <Applications />;
      case 'messages':
        return <Messages />;
      case 'statistics':
        return <RecruiterDashboard />;
      case 'news':
        return <News />;
      case 'profile':
        return <StudentProfile />;
      default:
        return <StudentDashboard />;
    }
  };

  return <JpLayoutWithSidebar role="student">{getDashboardContent()}</JpLayoutWithSidebar>;
};

export default Dashboard;
