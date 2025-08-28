import React from 'react';
import {
  Typography,
  Stack,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { PRIMARY_COL } from '@stex-react/utils';
import { useRouter } from 'next/router';
import { getLocaleObject } from 'packages/alea-frontend/lang/utils';

interface DashboardHeaderProps {
  semester: string;
  semesterOptions: string[];
  loadingOptions?: boolean;
  onSemesterChange: (semester: string) => void;
  onToggleSemForm: () => void;
  showSemForm: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  semester,
  semesterOptions,
  loadingOptions = false,
  onSemesterChange,
  onToggleSemForm,
  showSemForm,
}) => {
  const router = useRouter();
  const {universityAdmin: t} = getLocaleObject(router);


  return (
    <>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontWeight: 700, color: PRIMARY_COL, letterSpacing: 1 }}
      >
        {t.universityAdminDashboard}
      </Typography>
      <Stack direction="row" spacing={2} mb={3}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="semester-select-label">{t.semester}</InputLabel>
          <Select
            labelId="semester-select-label"
            value={semester}
            label={t.semester}
            onChange={(e) => onSemesterChange(e.target.value)}
            disabled={loadingOptions}
          >
            {loadingOptions ? (
              <MenuItem disabled>{t.loading}</MenuItem>
            ) : (
              semesterOptions.map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))
            )}
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          color="primary"
          sx={{ fontWeight: 600 }}
          onClick={onToggleSemForm}
        >
          {showSemForm ? t.hideSemesterDetail : t.addSemesterDetail} Sem Detail
        </Button>
      </Stack>
    </>
  );
};
