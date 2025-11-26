import { Typography, Box } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { PRIMARY_COL } from '@alea/utils';

function InstructorDetails({ details = [] }) {
  return (
    <Box display="flex" alignItems="center" gap={1} mb={1}>
      <Typography variant="h6" sx={{ fontSize: '0.85rem', color: PRIMARY_COL, fontWeight: 800 }}>
        Instructor Names:
      </Typography>

      {details.map((item, index) => (
        <Box display="flex" key={index} gap={0.5} alignItems="center">
          <PersonIcon sx={{ color: PRIMARY_COL, fontSize: '1rem' }} />

          <Typography
            sx={{
              fontSize: '0.95rem',
              fontWeight: 400,
              color: PRIMARY_COL,
            }}
          >
            {item.name}
          </Typography>

          {index < details.length - 1 && (
            <Typography
              sx={{
                color: PRIMARY_COL,
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
