import { NextRequest, NextResponse } from 'next/server';

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

function redirectOldUrls(req: NextRequest): NextResponse | null {
  const { pathname, search } = req.nextUrl;
  
  // Pattern: /course-home/[courseId] -> /FAU/[courseId]/latest
  const courseHomeMatch = pathname.match(/^\/course-home\/([^/]+)$/);
  if (courseHomeMatch) {
    const courseId = courseHomeMatch[1];
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = `/FAU/${courseId}/latest`;
    return NextResponse.redirect(newUrl, 308);
  }

  // Pattern: /forum/[courseId] -> /FAU/[courseId]/latest/forum
  const forumMatch = pathname.match(/^\/forum\/([^/]+)$/);
  if (forumMatch) {
    const courseId = forumMatch[1];
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = `/FAU/${courseId}/latest/forum`;
    return NextResponse.redirect(newUrl, 308);
  }

  // Pattern: /forum/[courseId]/[threadId] -> /FAU/[courseId]/latest/forum/[threadId]
  const forumThreadMatch = pathname.match(/^\/forum\/([^/]+)\/(\d+)$/);
  if (forumThreadMatch) {
    const courseId = forumThreadMatch[1];
    const threadId = forumThreadMatch[2];
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = `/FAU/${courseId}/latest/forum/${threadId}`;
    return NextResponse.redirect(newUrl, 308);
  }

  const quizDashMatch = pathname.match(/^\/quiz-dash\/([^/]+)$/);
  if (quizDashMatch) {
    const courseId = quizDashMatch[1];
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = `/FAU/${courseId}/latest/quiz-dash`;
    return NextResponse.redirect(newUrl, 308);
  }

  const studyBuddyMatch = pathname.match(/^\/study-buddy\/([^/]+)$/);
  if (studyBuddyMatch) {
    const courseId = studyBuddyMatch[1];
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = `/FAU/${courseId}/latest/study-buddy`;
    return NextResponse.redirect(newUrl, 308);
  }

  const homeworkMatch = pathname.match(/^\/homework\/([^/]+)$/);
  if (homeworkMatch) {
    const courseId = homeworkMatch[1];
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = `/FAU/${courseId}/latest/homework`;
    return NextResponse.redirect(newUrl, 308);
  }

  const practiceProblemsMatch = pathname.match(/^\/practice-problems\/([^/]+)$/);
  if (practiceProblemsMatch) {
    const courseId = practiceProblemsMatch[1];
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = `/FAU/${courseId}/latest/practice-problems`;
    return NextResponse.redirect(newUrl, 308);
  }

  const courseViewMatch = pathname.match(/^\/course-view\/([^/]+)$/);
  if (courseViewMatch) {
    const courseId = courseViewMatch[1];
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = `/FAU/${courseId}/latest/course-view`;
    return NextResponse.redirect(newUrl, 308);
  }

  const courseNotesMatch = pathname.match(/^\/course-notes\/([^/]+)$/);
  if (courseNotesMatch) {
    const courseId = courseNotesMatch[1];
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = `/FAU/${courseId}/latest/course-notes`;
    return NextResponse.redirect(newUrl, 308);
  }

  const instructorDashMatch = pathname.match(/^\/instructor-dash\/([^/]+)$/);
  if (instructorDashMatch) {
    const courseId = instructorDashMatch[1];
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = `/FAU/${courseId}/latest/instructor-dash`;
    return NextResponse.redirect(newUrl, 308);
  }

  return null;
}

export function middleware(req: NextRequest) {
  const oldUrlRedirect = redirectOldUrls(req);
  if (oldUrlRedirect) {
    return oldUrlRedirect;
  }

  const { pathname, search } = req.nextUrl;

  if (!ENABLE_REDIRECT) return NextResponse.next();

  if (!FAU_DOMAIN || !TARGET_DOMAIN) {
    return NextResponse.next();
  }
  const host = req.headers.get('host')?.split(':')[0];

  if (host !== FAU_DOMAIN) return NextResponse.next();

  if (IDM_ALLOWLIST.some((p) => pathname.startsWith(p))) {
    console.log(`Bypassing redirect for allowlisted path: ${pathname}`);
    return NextResponse.next();
  }

  const redirectUrl = new URL(
    `https://${TARGET_DOMAIN}${pathname}${search}`
  );
  console.log(`Redirecting from ${host} ${pathname} to ${redirectUrl.href}`);
  return NextResponse.redirect(redirectUrl, 308);
}

export const config = {
  matcher: '/:path*',
};
