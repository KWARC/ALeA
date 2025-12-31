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

export function middleware(req: NextRequest) {
  if (!ENABLE_REDIRECT) return NextResponse.next();

  if (!FAU_DOMAIN || !TARGET_DOMAIN) {
    return NextResponse.next();
  }
  const host = req.headers.get('host')?.split(':')[0];
  const { pathname, search } = req.nextUrl;

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
