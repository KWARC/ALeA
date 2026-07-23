import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { launchUserFromQuery, type LaunchUser } from '../lib/lti';

type Props = {
  user: LaunchUser;
};

export const getServerSideProps = (async ({ query }) => {
  return {
    props: {
      user: launchUserFromQuery(query),
    },
  };
}) satisfies GetServerSideProps<Props>;

export default function LtiUserPage({ user }: Props) {
  const heading =
    user.role === 'instructor'
      ? 'Welcome Instructor'
      : user.role === 'student'
      ? 'Welcome Student'
      : 'Welcome LTI User';

  return (
    <>
      <Head>
        <title>Hello LTI Launch</title>
      </Head>
      <main>
        <p>LTI launch successful</p>
        <h1>{heading}</h1>
        <p>Role: {user.role || 'unknown'}</p>
        <p>User: {user.name || 'Not provided'}</p>
        <p>Email: {user.email || 'Not provided'}</p>
        <p>Id: {user.id || 'Not provided'}</p>
      </main>
    </>
  );
}
