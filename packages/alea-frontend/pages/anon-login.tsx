import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

/** Anonymous signup was removed (email-as-userId migration, phase 0). */
const AnonLoginRedirectPage: NextPage = () => {
  const router = useRouter();
  useEffect(() => {
    const target = typeof router.query.target === 'string' ? router.query.target : '';
    router.replace(target ? `/login?target=${encodeURIComponent(target)}` : '/login');
  }, [router]);
  return null;
};

export default AnonLoginRedirectPage;
