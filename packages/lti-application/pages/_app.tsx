import { AppProps } from 'next/app';
import Head from 'next/head';
import { CssBaseline } from '@mui/material';
import './styles.css';

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>ALeA Study Buddy LTI</title>
      </Head>
      <CssBaseline />
      <main className="app">
        <Component {...pageProps} />
      </main>
    </>
  );
}

export default CustomApp;
