import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { NextPage } from 'next';
import MainLayout from '../layouts/MainLayout';

const colorVariants = ['primary', 'secondary', 'success', 'error', 'warning', 'info'] as const;
const buttonVariants = ['contained', 'outlined', 'text'] as const;
const shadowLevels = [0, 1, 2, 3, 4, 6, 8, 12, 16] as const;

const TestPage: NextPage = () => {
  return (
    <MainLayout title="MUI Theme Test">
      <Box maxWidth="900px" mx="auto" p={3}>
        <Typography variant="h1" textAlign="center" gutterBottom>
          MUI Theme System Test
        </Typography>
        <Typography textAlign="center" color="text.secondary" mb={4}>
          Verify palette, typography, shadows & component overrides
        </Typography>
        <Card elevation={2} sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              Typography
            </Typography>
            <Stack spacing={1}>
              <Typography variant="h1">Heading h1</Typography>
              <Typography variant="h2">Heading h2</Typography>
              <Typography variant="h3">Heading h3</Typography>
              <Typography variant="h4">Heading h4</Typography>
              <Typography variant="h5">Heading h5</Typography>
              <Typography variant="h6">Heading h6</Typography>
              <Typography variant="body1">Body1 – regular paragraph text</Typography>
              <Typography variant="body2" color="text.secondary">
                Body2 – secondary text
              </Typography>
            </Stack>
          </CardContent>
        </Card>
        <Card elevation={3} sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              Palette Colors
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" mb={2}>
              {colorVariants.map((color) => (
                <Button key={color} variant="contained" color={color}>
                  {color.charAt(0).toUpperCase() + color.slice(1)}
                </Button>
              ))}
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              {colorVariants.map((color) => (
                <Chip key={color} label={color} color={color} />
              ))}
            </Stack>
          </CardContent>
        </Card>
        <Card elevation={4} sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              Buttons & Overrides
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" mb={1}>
              {buttonVariants.map((variant) => (
                <Button key={variant} variant={variant}>
                  {variant.charAt(0).toUpperCase() + variant.slice(1)}
                </Button>
              ))}
            </Stack>
            <Typography mt={1} color="text.secondary">
              ✔ Check borderRadius, fontWeight, textTransform
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={6} sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              Inputs & MenuItem
            </Typography>
            <Stack spacing={2} maxWidth={300}>
              <TextField label="TextField (default size)" fullWidth />
              <TextField label="Select Field" select fullWidth>
                <MenuItem value="1">Option One</MenuItem>
                <MenuItem value="2">Option Two</MenuItem>
              </TextField>
            </Stack>
          </CardContent>
        </Card>
        <Card elevation={8} sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              Shadows
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {shadowLevels.map((elevation) => (
                <Paper
                  key={elevation}
                  elevation={elevation}
                  sx={{
                    p: 2,
                    width: 120,
                    textAlign: 'center',
                    mb: 2,
                  }}
                >
                  elevation {elevation}
                </Paper>
              ))}
            </Stack>
          </CardContent>
        </Card>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5">Paper & Background</Typography>
          <Typography color="text.secondary">Check background.default & paper colors</Typography>
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default TestPage;
