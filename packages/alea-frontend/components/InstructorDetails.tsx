import PersonIcon from '@mui/icons-material/Person';
import { Box, Typography } from '@mui/material';
import Link from 'next/link';

function InstructorDetails({ details = [] }) {
  if (!details.length) return;
  return (
    <Box display="flex" alignItems="center" gap={1} my={1}>
      <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 800 }}>
        Instructors:
      </Typography>

      {details.map((item, index) => (
        <Box display="flex" key={index} gap={0.5} alignItems="center">
          <PersonIcon sx={{ color: 'text.primary', fontSize: 16 }} />
          {item.url ? (
            <Link
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'underline', color: 'text.primary' }}
            >
              <Typography variant="h5" sx={{ color: 'text.primary' }}>
                {item.name}
              </Typography>
            </Link>
          ) : (
            <Typography variant="h5" sx={{ color: 'text.primary' }}>
              {item.name}
            </Typography>
          )}
          {index < details.length - 1 && (
            <Typography sx={{ color: 'text.primary', fontWeight: 600, fontSize: 16 }}>|</Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

export default InstructorDetails;
