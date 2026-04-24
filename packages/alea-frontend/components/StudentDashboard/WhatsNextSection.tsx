import { pathToCourseHome, pathToCourseResource } from '@alea/utils';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { Box, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';
import { getLocaleObject } from '../../lang/utils';
import { QuickAccessCard } from './QuickAccessCard';
import type { WhatsNextSectionProps } from './types';
import { DEFAULT_INSTITUTION } from './types';
import { stripHtml } from './utils';

function formatScheduleSubtitle(ts: number, venue?: string) {
  return [dayjs(ts).format('ddd, MMM D · HH:mm'), venue].filter(Boolean).join(' · ');
}

function getScheduleLink(
  data: { livestreamUrl?: string; venueLink?: string },
  courseId: string
): { href: string; isExternal: boolean } {
  const fallback = pathToCourseHome(DEFAULT_INSTITUTION, courseId);
  const href = data.livestreamUrl || data.venueLink || fallback;
  return { href, isExternal: href !== fallback };
}

export function WhatsNextSection({ quickAccess }: WhatsNextSectionProps) {
  const t = getLocaleObject(useRouter()).studentWelcomeScreen;
  return (
    <Box sx={whatsNextSectionStyles.section}>
      <Typography variant="subtitle1" fontWeight={600} color="text.secondary" sx={{ mb: 2 }}>
        {t.whatsNext}
      </Typography>
      <Box sx={whatsNextSectionStyles.grid}>
        {quickAccess.liveQuiz && (
          <QuickAccessCard
            href={`/quiz/${quickAccess.liveQuiz.data.quizId}`}
            icon={QuizOutlinedIcon}
            title={t.liveQuiz}
            subtitle={t.joinNow}
            courseId={quickAccess.liveQuiz.courseId}
            isLive
          />
        )}
        {quickAccess.nextLecture?.data.isOngoing && (
          <QuickAccessCard
            {...getScheduleLink(quickAccess.nextLecture.data, quickAccess.nextLecture.courseId)}
            icon={CalendarTodayOutlinedIcon}
            title={t.ongoingLecture}
            subtitle={formatScheduleSubtitle(
              quickAccess.nextLecture.data.ts,
              quickAccess.nextLecture.data.venue
            )}
            courseId={quickAccess.nextLecture.courseId}
            isLive
          />
        )}
        {quickAccess.nextTutorial?.data.isOngoing && (
          <QuickAccessCard
            {...getScheduleLink(quickAccess.nextTutorial.data, quickAccess.nextTutorial.courseId)}
            icon={SchoolOutlinedIcon}
            title={t.ongoingTutorial}
            subtitle={formatScheduleSubtitle(
              quickAccess.nextTutorial.data.ts,
              quickAccess.nextTutorial.data.venue
            )}
            courseId={quickAccess.nextTutorial.courseId}
            isLive
          />
        )}
        {!quickAccess.liveQuiz && quickAccess.upcomingQuiz && (
          <QuickAccessCard
            href={pathToCourseResource(
              DEFAULT_INSTITUTION,
              quickAccess.upcomingQuiz.courseId,
              'latest',
              '/quiz-dash'
            )}
            icon={QuizOutlinedIcon}
            title={t.upcomingQuiz}
            subtitle={dayjs(quickAccess.upcomingQuiz.data.quizStartTs).format('ddd, MMM D · HH:mm')}
            courseId={quickAccess.upcomingQuiz.courseId}
          />
        )}
        {quickAccess.nextAssignment && (
          <QuickAccessCard
            href={`/homework-doc?id=${quickAccess.nextAssignment.data.id}&courseId=${quickAccess.nextAssignment.courseId}`}
            icon={AssignmentOutlinedIcon}
            title={t.latestAssignment}
            subtitle={`${t.due} ${dayjs(quickAccess.nextAssignment.data.dueTs).format(
              'MMM D, HH:mm'
            )} · ${stripHtml(quickAccess.nextAssignment.data.title)}`}
            courseId={quickAccess.nextAssignment.courseId}
          />
        )}
        {quickAccess.pendingCheatsheetUpload && (
          <QuickAccessCard
            href={quickAccess.pendingCheatsheetUpload.data.href}
            icon={UploadFileOutlinedIcon}
            title={t.cheatsheetUploadPending}
            subtitle={
              quickAccess.pendingCheatsheetUpload.data.windowEndTs
                ? `${t.uploadBefore} ${dayjs(
                    quickAccess.pendingCheatsheetUpload.data.windowEndTs
                  ).format('MMM D, HH:mm')}`
                : t.uploadPending
            }
            courseId={quickAccess.pendingCheatsheetUpload.courseId}
          />
        )}
        {quickAccess.nextLecture && !quickAccess.nextLecture.data.isOngoing && (
          <QuickAccessCard
            {...getScheduleLink(quickAccess.nextLecture.data, quickAccess.nextLecture.courseId)}
            icon={CalendarTodayOutlinedIcon}
            title={t.upcomingLecture}
            subtitle={formatScheduleSubtitle(
              quickAccess.nextLecture.data.ts,
              quickAccess.nextLecture.data.venue
            )}
            courseId={quickAccess.nextLecture.courseId}
          />
        )}
        {quickAccess.nextTutorial && !quickAccess.nextTutorial.data.isOngoing && (
          <QuickAccessCard
            {...getScheduleLink(quickAccess.nextTutorial.data, quickAccess.nextTutorial.courseId)}
            icon={SchoolOutlinedIcon}
            title={t.upcomingTutorial}
            subtitle={formatScheduleSubtitle(
              quickAccess.nextTutorial.data.ts,
              quickAccess.nextTutorial.data.venue
            )}
            courseId={quickAccess.nextTutorial.courseId}
          />
        )}
      </Box>
    </Box>
  );
}

const whatsNextSectionStyles = {
  section: {
    mb: 5,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: {
      xs: '1fr',
      sm: 'repeat(2, 1fr)',
      md: 'repeat(3, 1fr)',
      lg: 'repeat(5, 1fr)',
    },
    gap: 2,
  },
};
