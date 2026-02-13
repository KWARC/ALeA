import { NextRequest, NextResponse } from 'next/server';
import {
  pathToCourseHome,
  pathToCourseNotes,
  pathToCourseView,
  pathToStudyBuddy,
  pathToHomework,
  pathToPracticeProblems,
  pathToInstructorDash,
  pathToCourseResource,
} from '@alea/utils';

const DEFAULT_INSTITUTION = 'FAU';
const ENABLE_REDIRECT =
  process.env['NEXT_PUBLIC_ENABLE_FAU_REDIRECT'] === 'true';
const FAU_DOMAIN = process.env['NEXT_PUBLIC_FAU_DOMAIN'];
const TARGET_DOMAIN = process.env['NEXT_PUBLIC_NON_FAU_DOMAIN'];
const IDM_ALLOWLIST = [
  '/login',
  '/cross-domain-auth',
  '/api/cross-domain-auth',
  '/logout',
];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Skip API and static
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.startsWith('/static/')) {
    return NextResponse.next();
  }

  // Legacy URL redirects to new structure (308 permanent)
  const courseHomeMatch = pathname.match(/^\/course-home\/([^/]+)$/);
  if (courseHomeMatch) {
    const courseId = courseHomeMatch[1];
    const target = pathToCourseHome(DEFAULT_INSTITUTION, courseId, 'latest');
    return NextResponse.redirect(new URL(target + search, req.url), 308);
  }

  const courseNotesMatch = pathname.match(/^\/course-notes\/([^/]+)$/);
  if (courseNotesMatch) {
    const courseId = courseNotesMatch[1];
    const target = pathToCourseNotes(DEFAULT_INSTITUTION, courseId, 'latest');
    return NextResponse.redirect(new URL(target + search, req.url), 308);
  }

  const courseViewMatch = pathname.match(/^\/course-view\/([^/]+)$/);
  if (courseViewMatch) {
    const courseId = courseViewMatch[1];
    const target = pathToCourseView(DEFAULT_INSTITUTION, courseId, 'latest');
    return NextResponse.redirect(new URL(target + search, req.url), 308);
  }

  const homeworkMatch = pathname.match(/^\/homework\/([^/]+)$/);
  if (homeworkMatch) {
    const courseId = homeworkMatch[1];
    const target = pathToHomework(DEFAULT_INSTITUTION, courseId, 'latest');
    return NextResponse.redirect(new URL(target + search, req.url), 308);
  }

  const studyBuddyMatch = pathname.match(/^\/study-buddy\/([^/]+)$/);
  if (studyBuddyMatch) {
    const courseId = studyBuddyMatch[1];
    const target = pathToStudyBuddy(DEFAULT_INSTITUTION, courseId, 'latest');
    return NextResponse.redirect(new URL(target + search, req.url), 308);
  }

  const practiceProblemsMatch = pathname.match(/^\/practice-problems\/([^/]+)$/);
  if (practiceProblemsMatch) {
    const courseId = practiceProblemsMatch[1];
    const target = pathToPracticeProblems(DEFAULT_INSTITUTION, courseId, 'latest');
    return NextResponse.redirect(new URL(target + search, req.url), 308);
  }

  const quizDashMatch = pathname.match(/^\/quiz-dash\/([^/]+)$/);
  if (quizDashMatch) {
    const courseId = quizDashMatch[1];
    const target = pathToCourseResource(DEFAULT_INSTITUTION, courseId, 'latest', '/quiz-dash');
    return NextResponse.redirect(new URL(target + search, req.url), 308);
  }

  const instructorDashMatch = pathname.match(/^\/instructor-dash\/([^/]+)$/);
  if (instructorDashMatch) {
    const courseId = instructorDashMatch[1];
    const target = pathToInstructorDash(DEFAULT_INSTITUTION, courseId, 'latest');
    return NextResponse.redirect(new URL(target + search, req.url), 308);
  }

  const forumMatch = pathname.match(/^\/forum\/([^/]+)(?:\/(.+))?$/);
  if (forumMatch) {
    const courseId = forumMatch[1];
    const threadPath = forumMatch[2];
    const base = pathToCourseResource(DEFAULT_INSTITUTION, courseId, 'latest', '/forum');
    const target = threadPath ? `${base}/${threadPath}` : base;
    return NextResponse.redirect(new URL(target + search, req.url), 308);
  }

  const flashCardsMatch = pathname.match(/^\/flash-cards\/([^/]+)$/);
  if (flashCardsMatch) {
    const courseId = flashCardsMatch[1];
    const target = pathToCourseResource(DEFAULT_INSTITUTION, courseId, 'latest', '/flash-cards');
    return NextResponse.redirect(new URL(target + search, req.url), 308);
  }

  // FAU domain redirect (existing logic)
  if (!ENABLE_REDIRECT) return NextResponse.next();
  if (!FAU_DOMAIN || !TARGET_DOMAIN) return NextResponse.next();
  const host = req.headers.get('host')?.split(':')[0];
  if (host !== FAU_DOMAIN) return NextResponse.next();
  if (IDM_ALLOWLIST.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  const redirectUrl = new URL(`https://${TARGET_DOMAIN}${pathname}${search}`, req.url);
  return NextResponse.redirect(redirectUrl, 308);
}

export const config = {
  matcher: '/:path*',
};
