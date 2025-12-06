import { Cancel, CheckCircle, Send, Visibility } from "@mui/icons-material";
import { Dialog, DialogContent, DialogTitle, IconButton, List, ListItem, ListItemText, Tooltip } from "@mui/material";
import { ApplicantWithProfile, JobPostInfo, StudentData } from "@alea/spec";

export const ApplicantActionDialog=({
    openDialog,
    selectedJob,
    applicants,
    handleCloseDialog,
    handleViewProfile,
    handleAcceptApplication,
    handleRejectApplication,
    handleMakeOffer
  }:{
    openDialog: boolean;
    selectedJob: JobPostInfo;
    applicants: ApplicantWithProfile[];
    handleCloseDialog: () => void;
    handleViewProfile: (profile: StudentData) => void;
    handleAcceptApplication: (applicant: ApplicantWithProfile) =>Promise<void>;
    handleRejectApplication: (applicant: ApplicantWithProfile)=>Promise<void>;
    handleMakeOffer: (applicant: ApplicantWithProfile) => Promise<void>;
  
  }) => {
    return (
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          Applicants for {selectedJob?.jobTitle}
        </DialogTitle>
        <DialogContent>
          <List>
            {applicants.map((applicant) => (
              <ListItem key={applicant.id} sx={{ display: "flex", justifyContent: "space-between" }}>
                <ListItemText
                  primary={applicant.applicantId}
                  secondary={`Status: ${applicant.applicationStatus}`}
                />
                <Tooltip title="View Profile">
                  <IconButton color="primary" onClick={() => handleViewProfile(applicant.studentProfile[0])}>
                    <Visibility />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Accept Application">
                  <IconButton
                    color="success"
                    disabled={applicant.applicationStatus === "ACCEPTED"}
                    onClick={() => handleAcceptApplication(applicant)}
                    sx={{ ml: 1 }}
                  >
                    <CheckCircle />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reject Application">
                  <IconButton
                    color="error"
                    disabled={applicant.applicationStatus === "REJECTED"}
                    onClick={() => handleRejectApplication(applicant)}
                    sx={{ ml: 1 }}
                  >
                    <Cancel />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Make Offer">
                  <IconButton
                    color="primary"
                    disabled={applicant.applicationStatus === "OFFERED"}
                    onClick={() => handleMakeOffer(applicant)}
                    sx={{ ml: 1 }}
                  >
                    <Send />
                  </IconButton>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    );
  };