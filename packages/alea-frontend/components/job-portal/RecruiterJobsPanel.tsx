import { Delete, Edit, Groups } from '@mui/icons-material';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import { ApplicantWithProfile, deleteJobPost, getJobApplicationsByJobPost, getStudentProfileUsingUserId, JobPostInfo, StudentData, updateJobApplication } from '@alea/spec';
import { useState } from 'react';
import JobPostInfoForm from './JobPostInfoForm';
import { ApplicantActionDialog } from './ApplicantActionDialog';
import { ApplicantProfileDialog } from './ApplicantProfileDialog';

const EditJobPost = ({ isEditing, jobData, onClose, onUpdate }) => {
  return (
    <div>
      <Dialog open={isEditing} onClose={onClose} maxWidth="md" fullWidth keepMounted={false}>
        <DialogTitle>Edit Job Post</DialogTitle>
        <DialogContent>
          <JobPostInfoForm
            jobCategoryId={jobData?.jobCategoryId}
            onClose={onClose}
            jobData={jobData}
            onUpdate={onUpdate}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{ '&:hover': { backgroundColor: 'primary.main', color: 'white' } }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

const JobTable = ({
  totalJobPosts,
  renderActions,
}: {
  totalJobPosts: JobPostInfo[];
  renderActions: (job: JobPostInfo) => JSX.Element;
}) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: 'primary.main', color: 'white' }}>
            <TableCell sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
              Session
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
              Job Title
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {totalJobPosts.length > 0 ? (
            totalJobPosts.map((job, index) => (
              <TableRow key={index}>
                <TableCell sx={{ textAlign: 'center' }}>{job.session}</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>{job.jobTitle}</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>{renderActions(job)}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} sx={{ textAlign: 'center' }}>
                No jobs created yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export function RecruiterJobsPanel({
  totalJobPosts,
  setTotalJobPosts,
  onUpdate,
}: {
  totalJobPosts: JobPostInfo[];
  setTotalJobPosts: React.Dispatch<React.SetStateAction<JobPostInfo[]>>;
  onUpdate: () => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [jobData, setJobData] = useState<JobPostInfo>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPostInfo>(null);
  const [applicants, setApplicants] = useState<ApplicantWithProfile[]>([]);

  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);

  const handleEdit = (job: JobPostInfo) => {
    setJobData(job);
    console.log({ job });

    setIsEditing(true);
  };

  const handleClose = () => {
    setIsEditing(false);
  };
  const handleDelete = async (job: JobPostInfo) => {
    console.log({ job });
    await deleteJobPost(job?.id);
    onUpdate();
    console.log({ totalJobPosts });
    console.log('dfd', totalJobPosts);
  };

  async function viewApplicants(job: JobPostInfo) {
    const applications = await getJobApplicationsByJobPost(job?.id);
    console.log({ applications });
    const applicant: ApplicantWithProfile[] = await Promise.all(
      applications.map(async (application) => {
        const studentProfile = await getStudentProfileUsingUserId(application.applicantId);
        return { ...application, studentProfile };
      })
    );
    setApplicants(applicant);

    setSelectedJob(job);
    setOpenDialog(true);
  }
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setApplicants([]);
    setSelectedJob(null);
  };

  const handleViewProfile = (profile: StudentData) => {
    setSelectedStudentProfile(profile);
    setOpenProfileDialog(true);
  };

  const handleCloseProfileDialog = () => {
    setOpenProfileDialog(false);
    setSelectedStudentProfile(null);
  };

  async function handleAcceptApplication(applicant: ApplicantWithProfile) {
    const application = { ...applicant, applicationStatus: 'ACCEPTED', recruiterAction: 'ACCEPT' };
    const res = await updateJobApplication(application);
    setOpenDialog(false);
  }

  async function handleRejectApplication(applicant: ApplicantWithProfile) {
    const application = { ...applicant, applicationStatus: 'REJECTED', recruiterAction: 'REJECT' };
    const res = await updateJobApplication(application);
    setOpenDialog(false);
  }

  async function handleMakeOffer(applicant: ApplicantWithProfile) {
    const application = {
      ...applicant,
      applicationStatus: 'OFFERED',
      recruiterAction: 'SEND_OFFER',
    };
    const res = await updateJobApplication(application);
    setOpenDialog(false);
  }

  console.log({ applicants: applicants });
  const renderActions = (job: JobPostInfo) => (
    <>
      <Tooltip title="Edit">
        <IconButton onClick={() => handleEdit(job)} color="primary">
          <Edit />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton onClick={() => handleDelete(job)} color="error">
          <Delete />
        </IconButton>
      </Tooltip>
      <Tooltip title="Applicants">
        <IconButton onClick={() => viewApplicants(job)} color="primary">
          <Groups />
        </IconButton>
      </Tooltip>
    </>
  );

  return (
    <>
      <JobTable totalJobPosts={totalJobPosts} renderActions={renderActions} />
      <ApplicantActionDialog
        openDialog={openDialog}
        selectedJob={selectedJob}
        applicants={applicants}
        handleCloseDialog={handleCloseDialog}
        handleViewProfile={handleViewProfile}
        handleAcceptApplication={handleAcceptApplication}
        handleRejectApplication={handleRejectApplication}
        handleMakeOffer={handleMakeOffer}
      />
      <ApplicantProfileDialog
        openProfileDialog={openProfileDialog}
        handleCloseProfileDialog={handleCloseProfileDialog}
        selectedStudentProfile={selectedStudentProfile}
      />

      {isEditing && (
        <EditJobPost
          isEditing={isEditing}
          jobData={jobData}
          onClose={handleClose}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
}
