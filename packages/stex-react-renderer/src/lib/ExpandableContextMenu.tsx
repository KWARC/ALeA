import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { IconButton, Menu, MenuItem } from '@mui/material';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getLocaleObject } from './lang/utils';
import { getFlamsServer } from '@kwarc/ftml-react';

export function ExpandableContextMenu({ uri }: { uri?: string }) {
  const t = getLocaleObject(useRouter());
  const [sourceUrl, setSourceUrl] = useState<string | undefined>(undefined);
  // menu crap start
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  // menu crap end

  useEffect(() => {
    if (!uri) return;
    setSourceUrl(undefined);
    getFlamsServer().sourceFile({ uri }).then(setSourceUrl);
  }, [uri]);

  if (!sourceUrl) return null;

  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        sx={{
          zIndex: '1',
          color: '#0004',
          border: '1px solid transparent',
          '&:hover': {
            backgroundColor: '#FFF',
            color: 'black',
            border: '1px solid #CCC',
            boxShadow: '#0005 0px 8px 15px',
          },
        }}
      >
        <MoreVertIcon />
      </IconButton>

      <Menu
        id="comment-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{ 'aria-labelledby': 'basic-button' }}
      >
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          sx={{ p: '0' }}
        >
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'flex', padding: '6px 16px', width: '100%' }}
          >
            <IntegrationInstructionsIcon />
            &nbsp;{t.viewSource}&nbsp;
            <OpenInNewIcon sx={{ fontSize: '14px' }} fontSize="small" />
          </a>
        </MenuItem>
      </Menu>
    </>
  );
}
