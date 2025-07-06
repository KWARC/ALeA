import React, { useState } from 'react';
import { Slider, Typography, Box } from '@mui/material';

const EligibleYearSlider = () => {
  const [targetYear, setTargetYear] = useState(2023); // Default selected year
  const minYear = 2022; // Start year for eligibility
  const maxYear = new Date().getFullYear() + 5; // Adjustable range

  const handleChange = (event, newValue) => {
    setTargetYear(newValue);
  };

  return (
    <Box sx={{ width: '100%', padding: 2 }}>
      <Typography variant="h6" gutterBottom>
        Select Eligible Batch Year
      </Typography>

      <Slider
        value={targetYear}
        onChange={handleChange}
        min={minYear}
        max={maxYear}
        marks={Array.from({ length: maxYear - minYear + 1 }, (_, i) => ({
          value: minYear + i,
          label: `${minYear + i}`,
        }))}
        valueLabelDisplay="auto"
      />

      <Typography variant="body1" sx={{ mt: 2 }}>
        Students eligible for the year <strong>{targetYear}</strong> onwards are displayed.
      </Typography>
    </Box>
  );
};

export default EligibleYearSlider;
