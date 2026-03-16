import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, Chip, Typography } from '@mui/material';
import Link from 'next/link';
import type { QuickAccessCardProps } from './types';

const LINK_STYLES = { textDecoration: 'none', color: 'inherit' };

export function QuickAccessCard({
  href,
  isExternal,
  icon: Icon,
  title,
  subtitle,
  courseId,
  isLive = false,
}: QuickAccessCardProps) {
  const textColor = isLive ? 'primary.dark' : 'text.secondary';
  const content = (
    <Box
      sx={{
        ...quickAccessCardStyles.root,
        ...(isLive && {
          borderColor: 'success.main',
          bgcolor: 'success.light',
          '&:hover': { borderColor: 'success.dark' },
        }),
      }}
    >
      <Box
        sx={{
          ...quickAccessCardStyles.iconBox,
          ...(isLive && { bgcolor: 'success.main' }),
        }}
      >
        <Icon sx={{ fontSize: 16 }} />
      </Box>
      <Box sx={quickAccessCardStyles.content}>
        <Typography variant="caption" noWrap sx={{ color: textColor }}>
          {courseId.toUpperCase()}
        </Typography>
        <Box sx={quickAccessCardStyles.titleRow}>
          <Typography
            variant="body2"
            fontWeight={600}
            noWrap
            sx={{ color: isLive ? 'primary.dark' : 'text.primary' }}
          >
            {title}
          </Typography>
          {isLive && <Chip label="LIVE" size="small" sx={quickAccessCardStyles.liveChip} />}
        </Box>
        {subtitle && (
          <Typography variant="caption" noWrap display="block" sx={{ color: textColor }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <ChevronRightIcon sx={{ ...quickAccessCardStyles.chevron, color: textColor }} />
    </Box>
  );

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noreferrer" style={LINK_STYLES}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} style={LINK_STYLES}>
      {content}
    </Link>
  );
}

const quickAccessCardStyles = {
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    p: 1.25,
    borderRadius: 1.5,
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: 'background.paper',
    transition: 'all 0.2s',
    cursor: 'pointer',
    height: '100%',
    '&:hover': { borderColor: 'primary.main', boxShadow: 2 },
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: 'primary.main',
    color: 'white',
    flexShrink: 0,
  },
  content: { flex: 1, minWidth: 0 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 },
  liveChip: { height: 16, fontSize: '0.6rem', bgcolor: 'success.dark', color: 'white' },
  chevron: { flexShrink: 0, fontSize: 18 },
};
