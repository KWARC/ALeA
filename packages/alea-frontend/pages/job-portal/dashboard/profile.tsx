import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  Avatar,
  Button,
  Divider,
  Chip,
  Grid,
  Paper,
  IconButton,
  Badge,
  Toolbar,
} from '@mui/material';
import {
  Email,
  Phone,
  School,
  Work,
  DateRange,
  Description,
  LinkedIn,
  GitHub,
} from '@mui/icons-material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MessageIcon from '@mui/icons-material/Message';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
export const StudentProfile = ({ student }: { student?: any }) => {
  const [activeTab, setActiveTab] = useState('personal');

  // Sample student data (would be passed as props in actual implementation)
  const profileData = student || {
    name: 'Fake Joy',
    email: 'fake.joy@fau.edu',
    mobile: '9876543210',
    programme: 'Computer Science & Engineering',
    yearOfAdmission: '2021',
    yearOfGraduation: '2025',
    about:
      'Passionate computer science student with interests in machine learning and web development. Currently seeking internship opportunities in software development.',
    courses: 'Data Structures, Algorithms, Machine Learning, Web Development',
    grades: 'GPA: 4.1/5',
    resumeUrl: '#',
    skills: ['JavaScript', 'React', 'Python', 'Machine Learning', 'SQL', 'Git'],
  };

  return (
    <Box sx={{ maxWidth: '1200px' }}>
      <Box sx={{ mt: '60px' }}>
        <Paper
          elevation={3}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            mb: 4,
            background: 'linear-gradient(135deg, #6a82fb 0%, #fc5c7d 100%)',
          }}
        >
          <Box
            sx={{
              p: 4,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              color: 'white',
            }}
          >
            <Avatar
              sx={{
                width: 120,
                height: 120,
                bgcolor: '#fff',
                color: 'primary.main',
                fontSize: 48,
                mr: { xs: 0, md: 4 },
                mb: { xs: 2, md: 0 },
              }}
            >
              {profileData.name.charAt(0)}
            </Avatar>

            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                {profileData.name}
              </Typography>

              <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
                {profileData.programme}
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {profileData.skills.slice(0, 5).map((skill, index) => (
                  <Chip
                    key={index}
                    label={skill}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
                    }}
                  />
                ))}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Email sx={{ mr: 1 }} />
                  <Typography variant="body2">{profileData.email}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Phone sx={{ mr: 1 }} />
                  <Typography variant="body2">{profileData.mobile}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <DateRange sx={{ mr: 1 }} />
                  <Typography variant="body2">
                    {profileData.yearOfAdmission} - {profileData.yearOfGraduation}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ mt: { xs: 3, md: 0 } }}>
              <Button
                variant="contained"
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  fontWeight: 'bold',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' },
                }}
                href={profileData.resumeUrl}
                target="_blank"
              >
                View Resume
              </Button>
            </Box>
          </Box>
        </Paper>

        <Box sx={{ display: 'flex', mb: 3, borderBottom: '1px solid #eee' }}>
          {[
            { id: 'personal', label: 'About Me' },
            { id: 'education', label: 'Education' },
            { id: 'skills', label: 'Skills & Expertise' },
          ].map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              sx={{
                py: 2,
                px: 4,
                fontWeight: 'bold',
                color: activeTab === tab.id ? 'primary.main' : 'text.secondary',
                borderBottom: activeTab === tab.id ? '3px solid' : 'none',
                borderColor: 'primary.main',
                borderRadius: 0,
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  color: 'primary.main',
                },
              }}
            >
              {tab.label}
            </Button>
          ))}
        </Box>

        <Box sx={{ p: 1 }}>
          {activeTab === 'personal' && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', mb: 2 }}
                  >
                    <Description sx={{ mr: 1, color: 'primary.main' }} />
                    About Me
                  </Typography>
                  <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                    {profileData.about}
                  </Typography>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ p: 3, borderRadius: 3, height: '100%', boxShadow: 2 }}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', mb: 2 }}
                  >
                    <Work sx={{ mr: 1, color: 'primary.main' }} />
                    Contact Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Email sx={{ mr: 2, color: 'text.secondary' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Email
                        </Typography>
                        <Typography variant="body1">{profileData.email}</Typography>
                      </Box>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Phone sx={{ mr: 2, color: 'text.secondary' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Phone
                        </Typography>
                        <Typography variant="body1">{profileData.mobile}</Typography>
                      </Box>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LinkedIn sx={{ mr: 2, color: 'text.secondary' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          LinkedIn
                        </Typography>
                        <Typography variant="body1">linkedin.com/in/fakeJoy</Typography>
                      </Box>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <GitHub sx={{ mr: 2, color: 'text.secondary' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          GitHub
                        </Typography>
                        <Typography variant="body1">github.com/fake-joy</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ p: 3, borderRadius: 3, height: '100%', boxShadow: 2 }}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', mb: 2 }}
                  >
                    <School sx={{ mr: 1, color: 'primary.main' }} />
                    Academic Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <DateRange sx={{ mr: 2, color: 'text.secondary' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Year of Admission
                        </Typography>
                        <Typography variant="body1">{profileData.yearOfAdmission}</Typography>
                      </Box>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <DateRange sx={{ mr: 2, color: 'text.secondary' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Expected Graduation
                        </Typography>
                        <Typography variant="body1">{profileData.yearOfGraduation}</Typography>
                      </Box>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <School sx={{ mr: 2, color: 'text.secondary' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Programme
                        </Typography>
                        <Typography variant="body1">{profileData.programme}</Typography>
                      </Box>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Description sx={{ mr: 2, color: 'text.secondary' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Academic Performance
                        </Typography>
                        <Typography variant="body1">{profileData.grades}</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          )}

          {activeTab === 'education' && (
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Educational Background
              </Typography>

              <Box sx={{ display: 'flex', mb: 4 }}>
                <Box
                  sx={{
                    minWidth: 60,
                    height: 60,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'primary.light',
                    borderRadius: 2,
                    mr: 3,
                  }}
                >
                  <School sx={{ color: 'white', fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h6">B.Tech in {profileData.programme}</Typography>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    University Institute of Technology • {profileData.yearOfAdmission} -{' '}
                    {profileData.yearOfGraduation}
                  </Typography>
                  <Typography variant="body2">{profileData.grades}</Typography>
                </Box>
              </Box>

              <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
                Key Courses
              </Typography>

              <Grid container spacing={1}>
                {profileData.courses.split(', ').map((course, index) => (
                  <Grid item key={index}>
                    <Chip
                      label={course}
                      sx={{
                        bgcolor: 'primary.light',
                        color: 'white',
                        fontWeight: 'medium',
                        mb: 1,
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Card>
          )}

          {activeTab === 'skills' && (
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Technical Skills
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'primary.light', color: 'white' }}>
                    <Typography variant="h6" gutterBottom>
                      Programming
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {['JavaScript', 'Python', 'Java', 'C++'].map((skill, index) => (
                        <Chip
                          key={index}
                          label={skill}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            mb: 1,
                          }}
                        />
                      ))}
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'secondary.light', color: 'white' }}>
                    <Typography variant="h6" gutterBottom>
                      Web Technologies
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {['React', 'Node.js', 'HTML/CSS', 'MongoDB'].map((skill, index) => (
                        <Chip
                          key={index}
                          label={skill}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            mb: 1,
                          }}
                        />
                      ))}
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'success.light', color: 'white' }}>
                    <Typography variant="h6" gutterBottom>
                      Data Science
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {['Machine Learning', 'SQL', 'Pandas', 'Tensorflow'].map((skill, index) => (
                        <Chip
                          key={index}
                          label={skill}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            mb: 1,
                          }}
                        />
                      ))}
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Professional Skills
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {[
                        'Project Management',
                        'Team Collaboration',
                        'Problem Solving',
                        'Technical Writing',
                        'Public Speaking',
                      ].map((skill, index) => (
                        <Chip
                          key={index}
                          label={skill}
                          variant="outlined"
                          color="primary"
                          sx={{ mb: 1 }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Card>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default StudentProfile;
