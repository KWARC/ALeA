import React, { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, Typography } from '@mui/material';
import { getJobCategories, InitialJobData, JobCategoryInfo } from '@alea/spec';
import { JobCategoryDetails } from '../../pages/job-portal/admin-dashboard';
import JobPostInfoForm from './JobPostInfoForm';
import { CURRENT_TERM } from '@alea/utils';

type CurrentView = 'jobList' | 'jobDetails';
const RecruiterJobDialog = ({
  open,
  onClose,
  onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  onUpdate: () => Promise<void>;
}) => {
  const [jobCategories, setJobCategories] = useState<JobCategoryInfo[]>(null);
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<CurrentView>('jobList');
  const [selectedJobCategoryId, setSelectedJobCategoryId] = useState<number>(null);
  const [jobData, setJobData] = useState<InitialJobData>(null);

  const handleJobSelect = (job: JobCategoryInfo) => {
    setJobData({ session: `${job.jobCategory}(${CURRENT_TERM})` });
    setSelectedJobCategoryId(job.id);
    setCurrentView('jobDetails');
  };

  const fetchJobCategoryData = async () => {
    try {
      setLoading(true);
      const res = await getJobCategories(CURRENT_TERM);
      setJobCategories(res);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobCategoryData();
  }, []);

  const renderActions = (job: JobCategoryInfo) => (
    <Button variant="contained" color="primary" onClick={() => handleJobSelect(job)}>
      Post Job
    </Button>
  );

  if (loading) return;
  return (
    <div>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          {currentView === 'jobList' && (
            <>
              <Typography variant="h6">Available Jobs - Ongoing Session</Typography>
              <JobCategoryDetails jobCategories={jobCategories} renderActions={renderActions} />
            </>
          )}
          {currentView === 'jobDetails' && (
            <JobPostInfoForm
              jobCategoryId={selectedJobCategoryId}
              onClose={onClose}
              jobData={jobData}
              onUpdate={onUpdate}
            />
          )}
        </DialogContent>
        <DialogActions>
          {currentView === 'jobDetails' && (
            <Button
              onClick={() => setCurrentView('jobList')}
              variant="outlined"
              sx={{
                '&:hover': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                },
              }}
            >
              Back
            </Button>
          )}
          {currentView === 'jobList' && (
            <Button
              onClick={onClose}
              variant="outlined"
              sx={{
                '&:hover': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                },
              }}
            >
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default RecruiterJobDialog;
