import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Step,
  StepLabel,
  Stepper,
  TextField,
} from '@mui/material';
import {
  OrganizationData,
  RecruiterAndOrgData,
  RecruiterData,
  updateOrganizationProfile,
  updateRecruiterProfile,
} from '@alea/spec';
import { useState } from 'react';

type FormSection = 'recruiterDetails' | 'organizationInfo';

interface ValidationErrors {
  email: string;
  mobile: string;
  altMobile: string;
}

const RecruiterProfileStepper = ({
  activeStep,
  steps,
}: {
  activeStep: number;
  steps: string[];
}) => (
  <Stepper activeStep={activeStep} alternativeLabel>
    {steps.map((label) => (
      <Step key={label}>
        <StepLabel>{label}</StepLabel>
      </Step>
    ))}
  </Stepper>
);

const RecruiterDetailsForm = ({
  formData,
  validationErrors,
  onChange,
}: {
  formData: RecruiterData;
  validationErrors: ValidationErrors;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    section: FormSection
  ) => void;
}) => (
  <div style={{ marginTop: '20px' }}>
    <TextField
      label="Email"
      name="email"
      fullWidth
      margin="normal"
      value={formData.email}
      onChange={(e) => onChange(e, 'recruiterDetails')}
      error={!!validationErrors.email}
      helperText={validationErrors.email}
    />
    <TextField
      label="Name"
      name="name"
      fullWidth
      margin="normal"
      value={formData.name}
      onChange={(e) => onChange(e, 'recruiterDetails')}
    />
    <TextField
      label="Designation"
      name="position"
      fullWidth
      margin="normal"
      value={formData.position}
      onChange={(e) => onChange(e, 'recruiterDetails')}
    />
    <TextField
      label="Mobile"
      name="mobile"
      fullWidth
      margin="normal"
      value={formData.mobile}
      onChange={(e) => onChange(e, 'recruiterDetails')}
      error={!!validationErrors.mobile}
      helperText={validationErrors.mobile}
    />
    <TextField
      label="Alternative Mobile"
      name="altMobile"
      fullWidth
      margin="normal"
      value={formData.altMobile}
      onChange={(e) => onChange(e, 'recruiterDetails')}
      error={!!validationErrors.altMobile}
      helperText={validationErrors.altMobile}
    />
  </div>
);

const OrganizationInfoForm = ({
  formData,
  onChange,
}: {
  formData: OrganizationData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    section: FormSection
  ) => void;
}) => (
  <div style={{ marginTop: '20px' }}>
    <TextField
      label="Company Name"
      name="companyName"
      fullWidth
      margin="normal"
      value={formData.companyName}
      onChange={(e) => onChange(e, 'organizationInfo')}
      disabled
    />
    <TextField
      label="Incorporation Year"
      name="incorporationYear"
      type="number"
      fullWidth
      margin="normal"
      value={formData.incorporationYear}
      onChange={(e) => onChange(e, 'organizationInfo')}
    />
    <TextField
      label="Startup"
      name="isStartup"
      select
      fullWidth
      margin="normal"
      value={formData.isStartup}
      onChange={(e) => onChange(e, 'organizationInfo')}
    >
      <MenuItem value="true">Yes</MenuItem>
      <MenuItem value="false">No</MenuItem>
    </TextField>
    <TextField
      label="Website"
      name="website"
      fullWidth
      margin="normal"
      value={formData.website}
      onChange={(e) => onChange(e, 'organizationInfo')}
    />
    <TextField
      label="About"
      name="about"
      multiline
      rows={3}
      fullWidth
      margin="normal"
      value={formData.about}
      onChange={(e) => onChange(e, 'organizationInfo')}
    />
    <TextField
      label="Type"
      name="companyType"
      fullWidth
      margin="normal"
      value={formData.companyType}
      onChange={(e) => onChange(e, 'organizationInfo')}
    />
    <TextField
      label="Office Address"
      name="officeAddress"
      fullWidth
      margin="normal"
      value={formData.officeAddress}
      onChange={(e) => onChange(e, 'organizationInfo')}
    />
    <TextField
      label="Office Postal Code"
      name="officePostalCode"
      fullWidth
      margin="normal"
      value={formData.officePostalCode}
      onChange={(e) => onChange(e, 'organizationInfo')}
    />
  </div>
);

const DialogActionButtons = ({
  activeStep,
  steps,
  onBack,
  onNext,
}: {
  activeStep: number;
  steps: string[];
  onBack: () => void;
  onNext: () => Promise<void>;
}) => (
  <DialogActions>
    {activeStep > 0 && (
      <Button
        onClick={onBack}
        variant="outlined"
        color="secondary"
        sx={{
          borderColor: 'secondary.main',
          color: 'secondary.main',
          '&:hover': {
            borderColor: 'primary.main',
            color: 'primary.main',
          },
        }}
      >
        Back
      </Button>
    )}
    <Button onClick={onNext} variant="contained" color="primary">
      {activeStep === steps.length - 1 ? 'Submit' : 'Save and Next'}
    </Button>
  </DialogActions>
);

const RecruiterProfileDialog = ({
  isOpen,
  setIsOpen,
  recruiterAndOrgData,
}: {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  recruiterAndOrgData: RecruiterAndOrgData;
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
    email: '',
    mobile: '',
    altMobile: '',
  });

  const steps = ['Recruiter Details', 'Organization Information'];

  const {
    id,
    userId,
    name,
    email,
    companyName,
    position,
    mobile,
    altMobile,
    incorporationYear,
    isStartup,
    about,
    companyType,
    officeAddress,
    officePostalCode,
    website,
  } = recruiterAndOrgData;
  interface RecruiterOrganizationFormState {
    recruiterDetails: RecruiterData;
    organizationInfo: OrganizationData;
  }
  const [formData, setFormData] = useState<RecruiterOrganizationFormState>({
    recruiterDetails: {
      email: email,
      name: name,
      position: position,
      mobile: mobile,
      altMobile: altMobile,
      userId: userId,
    },
    organizationInfo: {
      id: id,
      companyName: companyName,
      incorporationYear: incorporationYear,
      isStartup: isStartup,
      website: website,
      about: about,
      companyType: companyType,
      officeAddress: officeAddress,
      officePostalCode: officePostalCode,
      domain: 'TODO JP',
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    section: FormSection
  ) => {
    const { name, value } = e.target;

    let parsedValue: string | boolean = value;
    if (name === 'isStartup') {
      parsedValue = value === 'true';
    }

    setValidationErrors((prevErrors) => ({
      ...prevErrors,
      [name]: '',
    }));
    setFormData({
      ...formData,
      [section]: {
        ...formData[section],
        [name]: parsedValue,
      },
    });
  };

  const validateFields = () => {
    const errors = {
      email: '',
      mobile: '',
      altMobile: '',
    };
    if (!formData.recruiterDetails.email || !/\S+@\S+\.\S+/.test(formData.recruiterDetails.email)) {
      errors.email = 'Enter a valid email address.';
    }
    if (!formData.recruiterDetails.mobile || !/^\d{10}$/.test(formData.recruiterDetails.mobile)) {
      errors.mobile = 'Enter a valid 10-digit mobile number.';
    }
    if (
      formData.recruiterDetails.altMobile &&
      !/^\d{10}$/.test(formData.recruiterDetails.altMobile)
    ) {
      errors.altMobile = 'Enter a valid 10-digit mobile number or leave it empty.';
    }

    setValidationErrors(errors);
    return !errors.email && !errors.mobile && !errors.altMobile;
  };

  const handleNext = async () => {
    if (!validateFields()) {
      return;
    }
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      await updateOrganizationProfile(formData.organizationInfo, id);
      await updateRecruiterProfile({
        ...formData.recruiterDetails,
        organizationId: id,
        socialLinks: 'TODO JP',
      });
      setIsOpen(false);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setActiveStep(0);
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{steps[activeStep]}</DialogTitle>
      <DialogContent>
        <RecruiterProfileStepper activeStep={activeStep} steps={steps} />
        {activeStep === 0 && (
          <RecruiterDetailsForm
            formData={formData.recruiterDetails}
            validationErrors={validationErrors}
            onChange={handleChange}
          />
        )}
        {activeStep === 1 && (
          <OrganizationInfoForm formData={formData.organizationInfo} onChange={handleChange} />
        )}
      </DialogContent>
      <DialogActionButtons
        activeStep={activeStep}
        steps={steps}
        onBack={handleBack}
        onNext={handleNext}
      />
    </Dialog>
  );
};

export default RecruiterProfileDialog;
