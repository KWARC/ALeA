import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import { IconButton } from '@mui/material';
import { FileOpen, PersonAdd, Cancel, Pause } from '@mui/icons-material';
import { Chart } from 'react-google-charts';
import JpLayoutWithSidebar from '../../../layouts/JpLayoutWithSidebar';
import { PRIMARY_COL } from '@alea/utils';
import { JobSelect } from './applications';

const applicantData = [
  {
    name: 'Full Stack Developer',
    totalApplicants: 50,
    acceptedOffers: 30,
    rejectedOffers: 10,
    pending: 10,
  },
  {
    name: 'Software Engineer',
    totalApplicants: 40,
    acceptedOffers: 20,
    rejectedOffers: 5,
    pending: 15,
  },
];

const demoPieChartData = [
  ['Status', 'Applicants'],
  ['Applied', 300],
  ['Interviewed', 200],
  ['Offered', 100],
  ['Hired', 50],
];

const demoBarChartData = [
  ['Stage', 'Count'],
  ['Applied', 300],
  ['Interviewed', 200],
  ['Offered', 100],
  ['Hired', 50],
];

const recruiterStats = {
  totalApplicants: 2,
  totalJobsPosted: 2,
  totalOffers: 0,
  acceptedOffers: 0,
  rejectedOffers: 0,
};
const demoGPAData = [
  ['GPA Range', 'Count'],
  ['3.0 - 3.2', 25],
  ['3.3 - 3.5', 40],
  ['3.6 - 3.8', 30],
  ['3.9 - 4.0', 15],
];
const ApplicantDemographics = ({ applicants }) => {
  const transformApplicantDetails = (applicantData) => {
    const genderCounts = { Male: 0, Female: 0, Other: 0 };
    const locationCounts = {};
    const educationCounts = {};
    const gpaRanges = {
      '3.0 - 3.2': 0,
      '3.3 - 3.5': 0,
      '3.6 - 3.8': 0,
      '3.9 - 4.0': 0,
    };

    applicantData.forEach(({ studentProfile }) => {
      const { gender, location, programme, gpa } = studentProfile[0];

      if (genderCounts.hasOwnProperty(gender)) {
        genderCounts[gender]++;
      }

      if (location) {
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      }

      if (programme) {
        educationCounts[programme] = (educationCounts[programme] || 0) + 1;
      }

      if (gpa >= 3.0 && gpa <= 3.2) gpaRanges['3.0 - 3.2']++;
      else if (gpa > 3.2 && gpa <= 3.5) gpaRanges['3.3 - 3.5']++;
      else if (gpa > 3.5 && gpa <= 3.8) gpaRanges['3.6 - 3.8']++;
      else if (gpa > 3.8 && gpa <= 4.0) gpaRanges['3.9 - 4.0']++;
    });

    const genderData = [['Gender', 'Count']];
    Object.entries(genderCounts).forEach(([gender, count]) => {
      if (count > 0) {
        genderData.push([gender, String(count)]);
      }
    });

    const locationData = [['Location', 'Count']];
    Object.entries(locationCounts).forEach(([location, count]) => {
      locationData.push([location, String(count)]);
    });

    const educationData = [['Education Level', 'Count']];
    Object.entries(educationCounts).forEach(([education, count]) => {
      educationData.push([education, String(count)]);
    });

    const gpaData = [['GPA Range', 'Count']];
    Object.entries(gpaRanges).forEach(([range, count]) => {
      if (count > 0) {
        gpaData.push([range, String(count)]);
      }
    });

    return {
      genderData,
      locationData,
      educationData,
      gpaData,
    };
  };
  const { genderData, locationData, educationData, gpaData } =
    transformApplicantDetails(applicants);
  console.log({ genderData });
  console.log({ locationData });
  console.log({ educationData });
  console.log({ gpaData });
  return (
    <Box sx={{ padding: 5 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Applicant Demographics
      </Typography>
      <Grid container spacing={3}>
        {/* Gender Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Gender Distribution
              </Typography>
              <Chart
                chartType="PieChart"
                data={genderData}
                width="100%"
                height="300px"
                options={{
                  title: 'Gender Distribution of Applicants',
                  is3D: true,
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                GPA Distribution
              </Typography>
              <Chart
                chartType="Bar"
                data={gpaData} // You can replace this with your actual GPA data
                width="100%"
                height="300px"
                options={{
                  chart: {
                    title: 'GPA Distribution of Applicants',
                  },
                  hAxis: {
                    title: 'Count',
                  },
                  vAxis: {
                    title: 'GPA Range',
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Location Distribution
              </Typography>
              <Chart
                chartType="BarChart"
                data={locationData}
                options={{
                  title: 'Applicants by Location',
                  chartArea: { width: '50%' },
                  hAxis: {
                    title: 'Number of Applicants',
                    minValue: 0,
                  },
                  vAxis: {
                    title: 'Location',
                  },
                }}
                width="100%"
                height="300px"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Education Level Distribution
              </Typography>
              <Chart
                chartType="Bar"
                data={educationData}
                width="100%"
                height="300px"
                options={{
                  chart: {
                    title: 'Education Level Distribution of Applicants',
                  },
                  hAxis: {
                    title: 'Count',
                  },
                  vAxis: {
                    title: 'Education Level',
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

function RecruiterStatistics() {
  //   const [selectedJob, setSelectedJob] = useState('');
  const [loading, setLoading] = useState(false);
  const [applicants, setApplicants] = useState([]);
  //   console.log('hello', applicants);

  //   useEffect(() => {
  //     setLoading(true);
  //     setTimeout(() => setLoading(false), 1500); // Simulate fetching data
  //   }, [selectedJob]);

  const colors = ['#1CD083', '#5A69E2', '#48A9F8', '#8BC741'];
  const transformApplicantData = (applicantData) => {
    const statusCounts = {
      APPLIED: 0,
      SHORTLISTED_FOR_INTERVIEW: 0,
      ON_HOLD: 0,
      REJECTED: 0,
      OFFERED: 0,
      APPLICATION_WITHDRAWN: 0,
      OFFER_ACCEPTED: 0,
      OFFER_REJECTED: 0,
    };

    applicantData.forEach(({ applicationStatus }) => {
      if (statusCounts.hasOwnProperty(applicationStatus)) {
        statusCounts[applicationStatus]++;
      }
    });

    const pieChartData = [['Status', 'Applicants']];
    const barChartData = [['Stage', 'Count']];

    Object.entries(statusCounts).forEach(([status, count]) => {
      if (count > 0) {
        pieChartData.push([status.replace(/_/g, ' '), String(count)]);
        barChartData.push([status.replace(/_/g, ' '), String(count)]);
      }
    });

    return { pieChartData, barChartData };
  };

  const { pieChartData, barChartData } = transformApplicantData(applicants);

  return (
    <Box sx={{ padding: 5, bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom color={PRIMARY_COL} pl={20}>
        Recruiter Statistics
      </Typography>
      <Grid item xs={12} md={8} sx={{ p: ' 0 180px  50px 160px' }}>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Recruiter Overview
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: '#1CD083' }}>
                  <CardContent>
                    <Typography variant="h6" color="white">
                      Total Applicants
                    </Typography>
                    <Typography variant="h4" color="white">
                      {recruiterStats.totalApplicants}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: '#5A69E2' }}>
                  <CardContent>
                    <Typography variant="h6" color="white">
                      Total Jobs Posted
                    </Typography>
                    <Typography variant="h4" color="white">
                      {recruiterStats.totalJobsPosted}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: '#48A9F8' }}>
                  <CardContent>
                    <Typography variant="h6" color="white">
                      Offers Accepted
                    </Typography>
                    <Typography variant="h4" color="white">
                      {recruiterStats.acceptedOffers}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: '#8BC741' }}>
                  <CardContent>
                    <Typography variant="h6" color="white">
                      Offers Rejected
                    </Typography>
                    <Typography variant="h4" color="white">
                      {' '}
                      {recruiterStats.rejectedOffers}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      <Grid container spacing={3}>
        <Card
          sx={{
            padding: '16px',
            boxShadow: 3,
            borderRadius: '16px',
            maxWidth: '1200px',
            margin: 'auto',
          }}
        >
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ backgroundColor: '#f5f5f5', borderRadius: '16px', padding: '16px' }}>
                  <JobSelect setLoading={setLoading} setApplicants={setApplicants} />
                </Box>
              </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mt: 3 }}>
              <Grid item xs={12} md={6}>
                <Box sx={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px' }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Job Analytics
                  </Typography>
                  <Chart
                    chartType="PieChart"
                    data={pieChartData}
                    width="100%"
                    height="300px"
                    options={{
                      title: 'Job Applicant Breakdown',
                      is3D: true,
                      slices: {
                        0: { offset: 0.1 },
                        1: { offset: 0.1 },
                        2: { offset: 0.1 },
                        3: { offset: 0.1 },
                      },
                    }}
                  />
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px' }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Recruitment Funnel
                  </Typography>
                  <Chart
                    chartType="Bar"
                    data={barChartData}
                    // width="100%"
                    height="300px"
                    options={{
                      chart: {
                        title: 'Recruitment Funnel',
                        subtitle: 'Applicant progress across stages',
                      },
                      hAxis: {
                        title: 'Count',
                      },
                      vAxis: {
                        title: 'Stage',
                      },
                    }}
                  />
                </Box>
              </Grid>
            </Grid>

            <Grid container sx={{ mt: 3 }}>
              <Grid item xs={12}>
                <Box
                  sx={{
                    backgroundColor: '#e4e8f5',
                    borderRadius: '16px',
                    boxShadow: 3,
                    padding: '16px',
                    height: '100%',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <ApplicantDemographics applicants={applicants} />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Box>
  );
}
const Stats = () => {
  return <JpLayoutWithSidebar role="recruiter">{<RecruiterStatistics />}</JpLayoutWithSidebar>;
};

export default Stats;
