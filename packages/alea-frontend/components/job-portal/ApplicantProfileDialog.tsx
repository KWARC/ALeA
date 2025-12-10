import {
  Avatar,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Typography,
} from '@mui/material';

export const ApplicantProfileDialog = ({
  openProfileDialog,
  handleCloseProfileDialog,
  selectedStudentProfile,
}: {
  openProfileDialog: boolean;
  handleCloseProfileDialog: () => void;
  selectedStudentProfile: any;
}) => {
  return (
    <Dialog open={openProfileDialog} onClose={handleCloseProfileDialog} fullWidth maxWidth="sm">
      <DialogTitle>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 'bold',
            textAlign: 'center',
            paddingBottom: 2,
          }}
        >
          Student Profile
        </Typography>
      </DialogTitle>
      <DialogContent>
        {selectedStudentProfile && (
          <Card
            elevation={3}
            sx={{
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
                  ResumeURL
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedStudentProfile.resumeUrl}
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
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', paddingBottom: 2 }}>
        <Button
          onClick={handleCloseProfileDialog}
          variant="contained"
          color="primary"
          sx={{
            textTransform: 'none',
            paddingX: 4,
            borderRadius: 2,
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
