import { Box, Button } from '@mui/material';
import React, { useState } from 'react';

const ImageCard = ({ imageUrl, imageId }) => {
  const handleIdCopy = () => {
    navigator.clipboard.writeText(imageId);
  };

  const handleMarkdownCopy = () => {
    const markdown = `![markdownImage](${imageUrl})`;
    navigator.clipboard.writeText(markdown);
  };

  return (
    <Box
      sx={{
        padding: '20px',
        margin: '10px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 0 10px  gray',
        borderRadius: '10px',
        maxHeight: { xs: 267, md: 267 },
        maxWidth: { xs: 250, md: 250 },
        height: 600,
        width: 350,
      }}
    >
      <Box
        component="img"
        sx={{
          maxHeight: { xs: 233, md: 167 },
          maxWidth: { xs: 250, md: 250 },
        }}
        src={imageUrl}
      />
      <Box sx={{ display: 'flex', flexDirection: 'row' }}>
        <Button sx={{ m: '10px' }} variant="contained" color="primary" onClick={handleMarkdownCopy}>
          Copy Markdown
        </Button>
        <Button sx={{ m: '10px' }} variant="contained" color="primary" onClick={handleIdCopy}>
          Copy ImageId
        </Button>
      </Box>
    </Box>
  );
};

export default ImageCard;
