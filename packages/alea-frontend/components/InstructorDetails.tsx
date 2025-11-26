import { Typography, Stack, Paper } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";

function InstructorDetails({ details = [] }) {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: "#f9fafb",
        mt: 1,
        mb: 1,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
       
        <Typography
          variant="h6"
          sx={{ fontSize: "0.85rem", color: "#203360", fontWeight: 500 }}
        >
          Instructor Names:
        </Typography>

       
        <Stack direction="row" alignItems="center" spacing={3}>
          {details.map((item, index) => (
            <Stack
              key={index}
              direction="row"
              alignItems="center"
              spacing={1.5}
            >
              <PersonIcon sx={{ color: "#203360", fontSize: "1rem" }} />

              <Typography
                sx={{
                  fontSize: "0.95rem",
                  fontWeight: 400,
                  color: "#203360",
                }}
              >
                {item.name}
              </Typography>

            
              {index < details.length - 1 && (
                <Typography
                  sx={{
                    color: "#203360",
                    fontWeight: 600,
                   mx:2,          
                  }}
                >
                  |
                </Typography>
              )}
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

export default InstructorDetails;
