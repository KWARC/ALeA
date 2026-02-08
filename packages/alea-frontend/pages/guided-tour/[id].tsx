import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { TourDisplay } from '@alea/stex-react-renderer';
import { useTheme } from '@mui/material/styles';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';

const GuidedTourPage: NextPage = () => {
  const theme = useTheme();
  const router = useRouter();
  const { locale } = router;
  const [language, setLanguage] = useState(locale);
  const tourId = router.query.id ? decodeURI(router.query.id as string) : undefined;

  useEffect(() => setLanguage(locale), [locale]);

  return (
    <MainLayout title="Guided Tour">
      <Box display="flex" alignItems="center" mx="10px">
        <FormControl style={{ minWidth: '100px', margin: '10px 0' }}>
          <InputLabel id="lang-select-label">Language</InputLabel>
          <Select
            size="small"
            labelId="lang-select-label"
            id="lang-select"
            name="language"
            label="Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="de">Deutsch</MenuItem>
            <MenuItem value="fr">Français</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Box flexGrow={1} bgcolor="background.paper">
        <TourDisplay tourId={tourId} language={language} topOffset={125} />
      </Box>
    </MainLayout>
  );
};

export default GuidedTourPage;
