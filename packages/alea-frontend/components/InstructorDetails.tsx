import PersonIcon from '@mui/icons-material/Person';
import { Box, Typography, useTheme } from '@mui/material';
import Link from 'next/link';

function InstructorDetails({ details = [] }) {
  const theme = useTheme();
  const textColor = theme.palette.mode === 'dark' ? 'white' : 'primary.main';

  if (!details.length) return;
  return (
    <Box display="flex" alignItems="center" gap={1} my={1}>
      <Typography variant="h6" sx={{ color: textColor, fontWeight: 800 }}>
        Instructors:
      </Typography>

      {details.map((item, index) => (
        <Box display="flex" key={index} gap={0.5} alignItems="center">
          <PersonIcon sx={{ color: textColor }} />
          {item.url ? (
            <Link
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'underline', color: textColor }}
            >
              <Typography variant="h6" sx={{ color: textColor }}>
                {item.name}
              </Typography>
            </Link>
          ) : (
            <Typography variant="h6" sx={{ color: textColor }}>
              {item.name}
            </Typography>
          )}
          {index < details.length - 1 && (
            <Typography sx={{ color: textColor, fontWeight: 600 }}>|</Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

export default InstructorDetails;
