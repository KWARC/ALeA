import AssignmentIcon from '@mui/icons-material/Assignment';
import CancelIcon from '@mui/icons-material/Cancel';
import ChatIcon from '@mui/icons-material/Chat';
import EmojiPeopleIcon from '@mui/icons-material/EmojiPeople';
import { Box, Card, Chip, CircularProgress, Grid, Icon, Typography } from '@mui/material';
import { getJobApplicationsByUserId } from '@alea/spec';
import JpLayoutWithSidebar from '../../../layouts/JpLayoutWithSidebar';
import { useEffect, useState } from 'react';
import Chart from 'react-google-charts';
import JobStatsChart from './dashboard';

const StudentStats = () => {
  const [applications, setApplications] = useState([]);
  const [profileStrength, setProfileStrength] = useState(0);
  const [resumeInsights, setResumeInsights] = useState({
    skills: [],
    experience: 0,
    certifications: [],
    keywordsMatch: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        const data = await getJobApplicationsByUserId();
        setApplications(data);
        setProfileStrength(Math.floor(Math.random() * 51) + 50); // Random number between 50 and 100

        // Set dummy Resume Insights
        const skills = [
          'JavaScript',
          'React',
          'Node.js',
          'Python',
          'CSS',
          'HTML',
          'SQL',
          'MongoDB',
        ];
        const randomSkills = skills.slice(0, Math.floor(Math.random() * skills.length) + 1); // Randomize skills
        const experienceYears = Math.floor(Math.random() * 5) + 1; // Random years of experience between 1 and 5
        const certifications = ['AWS Certified', 'React JS Developer', 'Full Stack Developer'];
        const keywordsMatch = Math.floor(Math.random() * 10) + 1; // Random keyword match score between 1 and 10

        setResumeInsights({
          skills: randomSkills,
          experience: experienceYears,
          certifications: certifications,
          keywordsMatch: keywordsMatch,
        });
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  // Calculate the profile strength (Just a placeholder logic)
  const calculateProfileStrength = (data) => {
    const completedFields = data.filter((app) => app.completedFields).length;
    const totalFields = data.length;
    setProfileStrength(Math.floor((completedFields / totalFields) * 100));
  };

  // Analyze resume insights (Sample logic for insights)
  // const analyzeResumeInsights = (data) => {
  //   const skills = data.flatMap((app) => app.skills); // Assuming "skills" is part of the application data
  //   const uniqueSkills = [...new Set(skills)];
  //   setResumeInsights(uniqueSkills);
  // };

  //   const statusData = [
  //     ['Status', 'Count'],
  //     ['Applied', applications.filter((app) => app.applicationStatus === 'APPLIED').length],
  //     ['Accepted', applications.filter((app) => app.applicationStatus === 'ACCEPTED').length],
  //     ['Rejected', applications.filter((app) => app.applicationStatus === 'REJECTED').length],
  //   ];
  const statusData = [
    ['Status', 'Count'],
    ['Applied', 8],
    ['Accepted', 3],
    ['Rejected', 5],
  ];
  const categoryData = [
    ['Job Category', 'Applications'],
    ['SWE', applications.filter((app) => app.jobCategory === 'SWE').length],
    ['Design', applications.filter((app) => app.jobCategory === 'Design').length],
    ['Marketing', applications.filter((app) => app.jobCategory === 'Marketing').length],
    // Add more categories as per your data
  ];

  // Data for Profile Strength and Resume Insights
  const profileStrengthData = [
    ['Metric', 'Value'],
    ['Profile Strength', profileStrength],
  ];
  const colors = ['#1CD083', '#5A69E2', '#48A9F8', '#8BC741'];
  const icons = [
    <EmojiPeopleIcon sx={{ fontSize: '60px' }} />,
    <AssignmentIcon sx={{ fontSize: '60px' }} />,
    <CancelIcon sx={{ fontSize: '60px' }} />,
    <ChatIcon sx={{ fontSize: '60px' }} />,
  ];
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight="bold">
        Your Job Application Stats
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        <Grid container spacing={2}>
          {/* Profile Strength */}
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ padding: 2, border: '1px solid #ddd', borderRadius: 2, bgcolor: 'white' }}>
              <Typography variant="subtitle1">Profile Strength</Typography>
              <Chart
                chartType="Gauge"
                width="100%"
                height="250px"
                loader={<div>Loading Chart...</div>}
                data={profileStrengthData}
                options={{
                  redFrom: 0,
                  redTo: 50,
                  yellowFrom: 50,
                  yellowTo: 75,
                  greenFrom: 75,
                  greenTo: 100,
                  minorTicks: 5,
                }}
              />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={8}>
            <Box sx={{ padding: 2, border: '1px solid #ddd', borderRadius: 2, bgcolor: 'white' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Resume Insights
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">Skills Overview:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                  {resumeInsights.skills.map((skill, index) => (
                    <Chip key={index} label={skill} color="primary" sx={{ margin: 0.5 }} />
                  ))}
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">Experience Summary:</Typography>
                <Typography variant="body2">
                  You have {resumeInsights.experience} years of experience in your field.
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">Certifications:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                  {resumeInsights.certifications.map((cert, index) => (
                    <Chip key={index} label={cert} color="secondary" sx={{ margin: 0.5 }} />
                  ))}
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">Keyword Match:</Typography>
                <Typography variant="body2">
                  Your resume matches {resumeInsights.keywordsMatch} relevant keywords from the job
                  descriptions.
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ padding: 2, border: '1px solid #ddd', borderRadius: 2 }}>
              <Typography variant="subtitle1">Application Status Distribution</Typography>
              <Chart
                chartType="PieChart"
                width="100%"
                height="300px"
                loader={<div>Loading Chart...</div>}
                data={statusData}
                options={{
                  title: 'Applied vs Accepted vs Rejected',
                  is3D: true,
                  slices: {
                    0: { offset: 0.1 },
                    1: { offset: 0.1 },
                    2: { offset: 0.1 },
                  },
                }}
              />
            </Box>
          </Grid>

          {/* Bar Chart: Applications by Category */}
          {/* <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ padding: 2, border: '1px solid #ddd', borderRadius: 2 }}>
              <Typography variant="subtitle1">Applications by Category</Typography>
              <Chart
                chartType="BarChart"
                width="100%"
                height="300px"
                loader={<div>Loading Chart...</div>}
                data={categoryData}
                options={{
                  title: 'Applications by Category',
                  chartArea: { width: '50%' },
                  hAxis: {
                    title: 'Applications',
                    minValue: 0,
                  },
                  vAxis: {
                    title: 'Job Category',
                  },
                }}
              />
            </Box>
          </Grid> */}
          {/* <JobStatsChart applicationData={applications} />  TODO JP*/}
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ padding: 2, border: '1px solid #ddd', borderRadius: 2 }}>
              <Typography variant="subtitle1">Total Applications</Typography>
              <Typography variant="h6">{applications.length}</Typography>
            </Box>
          </Grid>
          {/* <Grid container spacing={2} sx={{ p: '70px 20px 20px 20px' }}>
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
                      sx={{ color: 'background.paper', fontWeight: '500', fontSize: '1.5rem' }}
                    >
                      {stat}
                    </Typography>
                    <Typography variant="h3" sx={{ color: 'background.paper', fontWeight: '600' }}>
                      {Math.floor(Math.random() * 100) % 10}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid> */}
          <Grid
            container
            spacing={2}
            sx={{
              p: '70px 20px 20px 20px',
              display: 'flex',
              // flexDirection: 'column', // Stack the items in a column
              alignItems: 'center', // Center items horizontally
            }}
          >
            {['Interviews', 'Applied', 'Rejected', 'Messages'].map((stat, index) => (
              <Grid
                item
                xs={12}
                sm={6}
                md={3}
                key={stat}
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  maxWidth: '300px',
                  width: '100%',
                  marginBottom: 2,
                }}
              >
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
                    width: '100%',
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
                  </Icon>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{ color: 'background.paper', fontWeight: '500', fontSize: '1.5rem' }}
                    >
                      {stat}
                    </Typography>
                    <Typography variant="h3" sx={{ color: 'background.paper', fontWeight: '600' }}>
                      {Math.floor(Math.random() * 100) % 10}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

const Stats = () => {
  return (
    <JpLayoutWithSidebar
      role="student"
      title="Statistics | Job Portal - ALeA"
      description="View your activity, application stats, and performance metrics on the ALeA Job Portal"
    >
      {<StudentStats />}
    </JpLayoutWithSidebar>
  );
};

export default Stats;
