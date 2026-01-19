import { PRIMARY_COL } from '@alea/utils';
import PersonIcon from '@mui/icons-material/Person';
import { Box, Typography } from '@mui/material';
import Link from 'next/link';

function InstructorDetails({ details = [] }) {
  if (!details.length) return;
  return (
    <Box display="flex" alignItems="center" gap={1} my={1}>
      <Typography variant="h6" sx={{ color: PRIMARY_COL, fontWeight: 800 }}>
        Instructors:
      </Typography>

      {details.map((item, index) => (
        <Box display="flex" key={index} gap={0.5} alignItems="center">
          <PersonIcon sx={{ color: PRIMARY_COL }} />
          {item.url ? (
            <Link
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'underline', color: PRIMARY_COL }}
            >
              <Typography variant="h6" sx={{ color: PRIMARY_COL }}>
                {item.name}
              </Typography>
            </Link>
          ) : (
            <Typography variant="h6" sx={{ color: PRIMARY_COL }}>
              {item.name}
            </Typography>
          )}
          {index < details.length - 1 && (
            <Typography sx={{ color: PRIMARY_COL, fontWeight: 600 }}>|</Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

export default InstructorDetails;
