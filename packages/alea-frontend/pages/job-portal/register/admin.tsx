import { Container, Box, TextField, Button, Typography } from "@mui/material";
import { useState } from "react";

export default function AdminRegistration() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = () => {
    console.log("Admin Registration Data:", formData);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      <Box
        sx={{
          textAlign: "center",
          border: "1px solid #ccc",
          borderRadius: 2,
          boxShadow: 3,
          p: 4,
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="h5" gutterBottom>
          Admin Registration
        </Typography>

        
        <TextField
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          type="email"
          fullWidth
          margin="normal"
        />

        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 3 }}
          onClick={handleSubmit}
        >
          Submit
        </Button>
      </Box>
    </Container>
  );
}
