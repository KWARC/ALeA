import React, { useState } from 'react';
import { Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { getParamFromUri } from '@alea/utils';

interface ProblemIdPreviewProps {
  uri: string;
  param: string;
}

const ProblemIdPreview: React.FC<ProblemIdPreviewProps> = ({ uri, param }) => {
  const value = getParamFromUri(uri, param);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(uri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  return (
    <Tooltip title={uri} arrow>
      <Typography
        component="span"
        onClick={handleCopy}
        sx={{
          cursor: 'pointer',
          textDecoration: 'underline dotted',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          '&:hover': {
            color: 'primary.10',
          },
        }}
      >
        ({value || 'Unknown'}{' '}
        {copied ? (
          <Typography component="span" sx={{ fontSize: 12, fontWeight: 500, color: '#4caf50' }}>
            Copied
          </Typography>
        ) : (
          <ContentCopyIcon sx={{ fontSize: 16 }} />
        )}
        )
      </Typography>
    </Tooltip>
  );
};

export default ProblemIdPreview;
