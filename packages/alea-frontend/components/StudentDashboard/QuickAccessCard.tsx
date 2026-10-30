import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import OndemandVideoOutlinedIcon from '@mui/icons-material/OndemandVideoOutlined';
import { Box, Button, Chip, Typography } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getLocaleObject } from '../../lang/utils';
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
  liveActions,
}: QuickAccessCardProps) {
  const t = getLocaleObject(useRouter()).studentWelcomeScreen;
  const textColor = isLive ? 'text.primary' : 'text.secondary';
  const details = (
    <>
      <Box
        sx={{
          ...quickAccessCardStyles.iconBox,
          ...(isLive && { bgcolor: 'success.main', color: 'success.contrastText' }),
        }}
      >
        <Icon sx={{ fontSize: 16 }} />
      </Box>
      <Box sx={quickAccessCardStyles.content}>
        <Typography variant="caption" noWrap sx={{ color: textColor }}>
          {courseId.toUpperCase()}
        </Typography>
        <Box sx={quickAccessCardStyles.titleRow}>
          <Typography variant="body2" fontWeight={600} noWrap sx={{ color: 'text.primary' }}>
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
    </>
  );
  const content = (
    <Box
      sx={{
        ...quickAccessCardStyles.root,
        ...(isLive && {
          borderColor: 'success.main',
          bgcolor: 'success.50',
          '&:hover': { borderColor: 'success.dark' },
        }),
        ...(liveActions && {
          gridColumn: { xs: 'auto' },
          width: { xs: '100%', md: 300 },
          containerType: 'inline-size',
          cursor: 'default',
          '& .MuiChip-root': { flexShrink: 0 },
        }),
      }}
    >
      {liveActions ? (
        <>
          <Link
            href={href}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noreferrer' : undefined}
            style={{
              ...LINK_STYLES,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flex: 1,
              minWidth: 0,
            }}
          >
            {details}
          </Link>
          <Box sx={quickAccessCardStyles.actionSlot}>
            <Box sx={quickAccessCardStyles.actions}>
              {[
                {
                  href: liveActions.venueLink?.trim(),
                  label: t.venueLink,
                  icon: LocationOnOutlinedIcon,
                },
                {
                  href: liveActions.livestreamUrl?.trim(),
                  label: t.joinLivestream,
                  icon: OndemandVideoOutlinedIcon,
                },
              ].map(({ href: actionHref, label, icon: ActionIcon }) => (
                <Button
                  key={label}
                  component={actionHref ? 'a' : 'button'}
                  href={actionHref || undefined}
                  disabled={!actionHref}
                  target={actionHref ? '_blank' : undefined}
                  rel={actionHref ? 'noreferrer' : undefined}
                  title={label}
                  aria-label={label}
                  variant="outlined"
                  size="small"
                  startIcon={<ActionIcon />}
                  sx={quickAccessCardStyles.actionButton}
                >
                  <Box
                    component="span"
                    className="live-action-label"
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {label}
                  </Box>
                </Button>
              ))}
            </Box>
          </Box>
        </>
      ) : (
        <>
          {details}
          <ChevronRightIcon sx={{ ...quickAccessCardStyles.chevron, color: textColor }} />
        </>
      )}
    </Box>
  );

  if (liveActions) return content;

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
  liveChip: {
    height: 16,
    fontSize: '0.6rem',
    bgcolor: 'success.main',
    color: 'success.contrastText',
  },
  chevron: { flexShrink: 0, fontSize: 18 },
  actionSlot: {
    position: 'relative',
    alignSelf: 'stretch',
    flexShrink: 0,
    width: 132,
    borderLeft: '1px solid',
    borderColor: 'divider',
    '@container (max-width: 340px)': {
      width: 36,
      '& .live-action-label': { display: 'none' },
    },
  },
  // Keep the controls out of intrinsic sizing so the existing card height stays unchanged.
  actions: {
    position: 'absolute',
    inset: 0,
    pl: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 0.5,
  },
  actionButton: {
    height: 24,
    minWidth: 0,
    px: 0.5,
    fontSize: '0.6875rem',
    textTransform: 'none',
    whiteSpace: 'nowrap',
    '& .MuiButton-startIcon': { ml: 0, mr: 0.5 },
    '& .MuiButton-startIcon > *:nth-of-type(1)': { fontSize: 16 },
    '@container (max-width: 340px)': { '& .MuiButton-startIcon': { m: 0 } },
  },
};
