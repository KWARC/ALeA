import type { HomeworkStub, QuizStubInfo } from '@alea/spec';
import type { CourseInfo } from '@alea/utils';
import type React from 'react';

export const DEFAULT_INSTITUTION = 'FAU';

export interface CourseStudentData {
  courseId: string;
  liveQuiz: QuizStubInfo | null;
  upcomingQuiz: QuizStubInfo | null;
  nextHomework: HomeworkStub | null;
  nextLectureTs: number | null;
  isLectureOngoing?: boolean;
  nextLectureVenue?: string;
  nextLectureVenueLink?: string;
  nextTutorialTs: number | null;
  isTutorialOngoing?: boolean;
  nextTutorialVenue?: string;
  nextTutorialVenueLink?: string;
  isSemesterOver: boolean;
}

export type QuickAccessItem<T> = {
  courseId: string;
  courseName: string;
  data: T;
};

export interface QuickAccessData {
  liveQuiz: QuickAccessItem<QuizStubInfo> | null;
  upcomingQuiz: QuickAccessItem<QuizStubInfo> | null;
  nextAssignment: QuickAccessItem<HomeworkStub> | null;
  nextLecture: QuickAccessItem<{
    ts: number;
    venue?: string;
    venueLink?: string;
    livestreamUrl?: string;
    isOngoing?: boolean;
  }> | null;
  nextTutorial: QuickAccessItem<{
    ts: number;
    venue?: string;
    venueLink?: string;
    isOngoing?: boolean;
  }> | null;
}

export interface SemesterOverBannerProps {
  courseHomeHref: string;
}

export interface QuickAccessCardProps {
  href: string;
  isExternal?: boolean;
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  courseId: string;
  isLive?: boolean;
}

export interface WhatsNextSectionProps {
  quickAccess: QuickAccessData;
}

export interface CourseDashboardCardProps {
  courseId: string;
  courseName: string;
  data: CourseStudentData | undefined;
  isLoading: boolean;
  institutionId: string;
  instance: string;
}

export interface ExploreCoursesSectionProps {
  courses: CourseInfo[];
  currentTerm: string | undefined;
  exploreCoursesTitle: string;
  exploreCoursesButtonLabel: string;
}

export interface EmptyEnrollmentStateProps {
  exploreCoursesLabel: string;
}
