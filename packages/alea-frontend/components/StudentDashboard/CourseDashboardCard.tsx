import {
  pathToCheatSheet,
  pathToCourseHome,
  pathToCourseNotes,
  pathToCourseResource,
  pathToCourseView,
  pathToHomework,
} from '@alea/utils';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined';
import { Box, Card, Skeleton, Typography } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getLocaleObject } from '../../lang/utils';
import { SemesterOverBanner } from './SemesterOverBanner';
import type { CourseDashboardCardProps } from './types';

export function CourseDashboardCard({
  courseId,
  courseName,
  data,
  isLoading,
  institutionId,
  instance,
  courseInfo,
}: CourseDashboardCardProps) {
  const t = getLocaleObject(useRouter()).studentWelcomeScreen;
  const courseHome = pathToCourseHome(institutionId, courseId, instance);
  const navLinks = [
    {
      href: pathToCourseResource(institutionId, courseId, instance, '/quiz-dash'),
      icon: QuizOutlinedIcon,
      label: t.quizSchedule,
      enabled: data?.hasQuiz,
    },
    {
      href: pathToHomework(institutionId, courseId, instance),
      icon: AssignmentOutlinedIcon,
      label: t.assignments,
      enabled: data?.hasHomework,
    },
    {
      href: pathToCourseNotes(institutionId, courseId, instance),
      icon: MenuBookOutlinedIcon,
      label: t.notes,
      enabled: true,
    },
    {
      href: pathToCourseView(institutionId, courseId, instance),
      icon: SlideshowOutlinedIcon,
      label: t.slides,
      enabled: true,
    },
    {
      href: pathToCheatSheet(institutionId, courseId, instance),
      icon: ArticleOutlinedIcon,
      label: t.cheatsheet,
      enabled: !!courseInfo?.cheatsheetConfig?.hasCheatsheet,
    },
  ].sort((a, b) => Number(Boolean(b.enabled)) - Number(Boolean(a.enabled)));

  if (isLoading || !data) {
    return (
      <Card sx={{ p: 3, borderRadius: 3, height: '100%' }}>
        <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={72} sx={{ mb: 1.5 }} />
        <Skeleton variant="rounded" height={72} />
      </Card>
    );
  }

  return (
    <Card sx={[courseCardStyles.root, courseCardStyles.cardHover]}>
      <Link href={courseHome} style={{ textDecoration: 'none' }}>
        <Typography variant="h6" fontWeight={700} color="text.primary" sx={courseCardStyles.title}>
          {courseName || courseId.toUpperCase()}
        </Typography>
      </Link>

      {data.isSemesterOver && <SemesterOverBanner courseHomeHref={courseHome} />}

      <Box sx={courseCardStyles.linksWrapper}>
        {navLinks.map(({ href, icon: Icon, label, enabled }) => {
          const row = (
            <Box
              key={label}
              aria-hidden={!enabled || undefined}
              sx={[
                courseCardStyles.linkRow,
                courseCardStyles.enabledLinkRow,
                { visibility: enabled ? 'visible' : 'hidden' },
              ]}
            >
              <Box className="icon-box" sx={courseCardStyles.iconBox}>
                <Icon />
              </Box>
              <Box>
                <Typography component="span" variant="body2" fontWeight={500}>
                  {label}
                </Typography>
                {!enabled && (
                  <Typography component="span" variant="caption" display="block">
                    {t.notEnabledForCourse}
                  </Typography>
                )}
              </Box>
              {enabled && <ChevronRightIcon className="chevron" sx={courseCardStyles.chevron} />}
            </Box>
          );

          return enabled ? (
            <Link key={label} href={href} style={{ textDecoration: 'none' }}>
              {row}
            </Link>
          ) : (
            row
          );
        })}
      </Box>
    </Card>
  );
}

const courseCardStyles = {
  root: {
    p: 3,
    borderRadius: 3,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid',
    borderColor: 'divider',
    boxShadow: 1,
    transition: 'box-shadow 0.25s ease, border-color 0.25s ease, transform 0.2s ease',
    overflow: 'hidden',
    position: 'relative' as const,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      bgcolor: 'primary.main',
      opacity: 0.9,
    },
  },
  cardHover: {
    '&:hover': {
      boxShadow: 4,
      borderColor: 'primary.light',
      transform: 'translateY(-2px)',
    },
  },
  title: {
    mb: 2,
    mt: 0.5,
    letterSpacing: '-0.01em',
    lineHeight: 1.3,
    transition: 'color 0.2s',
    '&:hover': { textDecoration: 'underline' },
  },
  linksWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.75,
    mt: 0.25,
  },
  linkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    py: 1.25,
    px: 1.5,
    borderRadius: 1.5,
    textDecoration: 'none',
    color: 'text.primary',
    transition: 'background-color 0.2s, color 0.2s, transform 0.2s',
  },
  enabledLinkRow: {
    '&:hover': {
      bgcolor: 'action.hover',
      color: 'text.primary',
    },
    '&:hover .icon-box': {
      bgcolor: 'primary.dark',
      transform: 'scale(1.05)',
    },
    '&:hover .chevron': {
      transform: 'translateX(2px)',
      color: 'text.primary',
    },
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 1.25,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    bgcolor: 'primary.main',
    color: 'white',
    transition: 'background-color 0.2s, transform 0.2s',
    '& .MuiSvgIcon-root': { fontSize: 18 },
  },
  chevron: {
    ml: 'auto',
    fontSize: 18,
    color: 'text.disabled',
    transition: 'transform 0.2s, color 0.2s',
  },
};
