import { Typography, Box, Tooltip, useTheme } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
// import { PRIMARY_COL } from '@alea/utils';
import Link from 'next/link';

function InstructorDetails({ details = [] }) {
  const theme = useTheme();
  // const isDarkMode = theme.palette.mode === 'dark';
  // const color = isDarkMode ? '#fff' : PRIMARY_COL;

  if (!details.length) return null;
  return (
    <Box display="flex" alignItems="center" gap={1} mb={1}>
      <Typography variant="h6" sx={{ fontSize: '0.85rem', color: 'text.primary', fontWeight: 800 }}>
        Instructors :
      </Typography>

      {details.map((item, index) => (
        <Box display="flex" key={index} gap={0.5} alignItems="center">
          <PersonIcon sx={{ color: 'text.primary', fontSize: '1rem' }} />
          {item.url ? (
            <Tooltip title={item.url}>
              <Link
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textDecoration: 'underline',
                  color: theme.palette.text.primary,
                  fontSize: '0.95rem',
                  fontWeight: 400,
                }}
              >
                {item.name}
              </Link>
            </Tooltip>
          ) : (
            <Typography
              sx={{
                fontSize: '0.95rem',
                fontWeight: 400,
                color: 'text.primary',
              }}
            >
              {item.name}
            </Typography>
          )}
          {index < details.length - 1 && (
            <Typography
              sx={{
                color: 'text.primary',
                fontWeight: 600,
              }}
            >
              |
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

export default InstructorDetails;
