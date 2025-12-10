import type { NextPage } from 'next';
import MainLayout from '../layouts/MainLayout';
import { SafeFTMLDocument } from '@alea/stex-react-renderer';

const HelpPage: NextPage = () => {
  return (
    <MainLayout title="Help | ALeA">
      <SafeFTMLDocument
        document={{
          type: 'FromBackend',
          uri: 'https://mathhub.info?a=voll-ki/ALeA&p=doc&d=help&l=en',
        }}
        toc={'Get'}
      />
    </MainLayout>
  );
};

export default HelpPage;
