import { getUserInformation } from '@alea/spec';
import { needsIdmEmailCollect } from '@alea/utils';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useIsLoggedIn } from '@alea/react-utils';

const EXEMPT_PREFIXES = [
  '/collect-email',
  '/verify',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/reset-and-redirect',
  '/anon-login',
  '/logout',
  '/auth-callback',
  '/profile',
  '/my-profile',
];

function isExemptPath(path: string) {
  const pathname = path.split('?')[0];
  return EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function EmailCollectGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const { loggedIn, loginCheckPending } = useIsLoggedIn();

  useEffect(() => {
    if (!router.isReady || loginCheckPending || !loggedIn) return;
    if (isExemptPath(router.asPath)) return;

    let cancelled = false;
    (async () => {
      try {
        const info = await getUserInformation(true);
        if (cancelled || !info || !needsIdmEmailCollect(info)) return;
        const target = router.asPath.startsWith('/') ? router.asPath : '/';
        await router.replace(`/collect-email?target=${encodeURIComponent(target)}`);
      } catch {
        /* unauthenticated / probe failed */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.asPath, loggedIn, loginCheckPending, router]);

  return <>{children}</>;
}
