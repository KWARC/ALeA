import { Edit } from '@mui/icons-material';
import { Box, Button, CircularProgress, IconButton, TextField, Typography } from '@mui/material';
import { OrganizationData, updateOrganizationProfile } from '@alea/spec';
import { useEffect, useState } from 'react';

export function OrganizationDetails({ data }: { data: OrganizationData }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orgData, setOrgData] = useState(data);
  useEffect(() => {
    if (data) setOrgData(data);
  }, [data]);

  const handleChange = (key: keyof OrganizationData, value: string) => {
    setOrgData((prev) => ({ ...prev, [key]: value }));
  };
  const handleSave = async () => {
    setLoading(true);
    setIsEditing(false);
    await updateOrganizationProfile(orgData, orgData?.id);
    setLoading(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setOrgData(data);
  };
  if (loading) return <CircularProgress />;
  return (
    <Box
      sx={{
        mb: 3,
        p: 3,
        borderRadius: '20px',
        bgcolor: '#fff',
        boxShadow: 3,
      }}
    >
      <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
        <Typography variant="h6" gutterBottom>
          Organization Details
        </Typography>
        <Box
          sx={{
            flexGrow: 1,
            height: '1px',
            backgroundColor: '#cfd0d1',
            m: 2,
          }}
        />
        {isEditing ? (
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              sx={{
                borderRadius: '50px',
                paddingX: 5,
                paddingY: 1,
                textTransform: 'none',
              }}
              onClick={handleCancel}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              sx={{
                borderRadius: '50px',
                paddingX: 5,
                paddingY: 1,
                textTransform: 'none',
                bgcolor: '#806BE7',
                color: 'white',
              }}
              onClick={handleSave}
            >
              Save
            </Button>
          </Box>
        ) : (
          <IconButton onClick={() => setIsEditing(true)}>
            <Edit />
          </IconButton>
        )}
      </Box>

      <Box display="flex" flexWrap="wrap" gap={4}>
        <Box sx={{ flex: '1 1 45%' }}>
          {[
            ['Organization', 'companyName'],
            ['Is Startup?', 'isStartup'],
            ['Company Type', 'companyType'],
            ['Incorporation Year', 'incorporationYear'],
          ].map(([label, key]) => (
            <Box key={key} mb={2}>
              {isEditing ? (
                <TextField
                  fullWidth
                  label={label}
                  variant="standard"
                  value={orgData[key as keyof OrganizationData] || ''}
                  onChange={(e) => handleChange(key as keyof OrganizationData, e.target.value)}
                />
              ) : (
                <Typography>
                  <strong>{label}:</strong> {orgData[key as keyof OrganizationData] || 'N/A'}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
        <Box sx={{ flex: '1 1 45%' }}>
          {[
            ['Website', 'website'],
            ['Office Address', 'officeAddress'],
            ['Office Postal Code', 'officePostalCode'],
          ].map(([label, key]) => (
            <Box key={key} mb={2}>
              {isEditing ? (
                <TextField
                  fullWidth
                  label={label}
                  variant="standard"
                  value={orgData[key as keyof OrganizationData] || ''}
                  onChange={(e) => handleChange(key as keyof OrganizationData, e.target.value)}
                />
              ) : (
                <Typography>
                  <strong>{label}:</strong> {orgData[key as keyof OrganizationData] || 'N/A'}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Box>

      <Box mt={2}>
        {isEditing ? (
          <TextField
            fullWidth
            multiline
            rows={3}
            label="About"
            variant="outlined"
            value={orgData.about || ''}
            onChange={(e) => handleChange('about', e.target.value)}
          />
        ) : (
          <Typography>
            <strong>About:</strong> {orgData.about || 'N/A'}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
