import { Button } from '@mui/material';
import { IKnowEvent, getUriWeightsV2, reportEventV2 } from '@stex-react/api';
import { localStore } from '@stex-react/utils';
import type { NextPage } from 'next';
import { useReducer } from 'react';
import MainLayout from '../layouts/MainLayout';

const FORCE_MATHJAX = 'forceMathJax';
const Home: NextPage = () => {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  return (
    <MainLayout title="Settings | VoLL-KI">
      <div>
        <main>
          <br />
          <Button
            variant="contained"
            size="small"
            sx={{ m: '5px' }}
            onClick={() => {
              if (localStore?.getItem(FORCE_MATHJAX))
                localStore.removeItem(FORCE_MATHJAX);
              else localStore?.setItem(FORCE_MATHJAX, 'yes');
              forceUpdate();
            }}
          >
            {localStore?.getItem(FORCE_MATHJAX)
              ? 'Use native rendering when possible'
              : 'Always use MathJax'}
          </Button>

          <Button
            variant="contained"
            size="small"
            sx={{ m: '5px' }}
            onClick={async () => {
              const resp = await reportEventV2({
                type: 'i-know',
                concept: 'testUri1',
              } as IKnowEvent);
              console.log(resp);
            }}
          >
            Set URI
          </Button>

          <Button
            variant="contained"
            size="small"
            sx={{ m: '5px' }}
            onClick={async () => {
              const resp = await getUriWeightsV2(['testUri1', 'testUri2']);
              console.log(resp);
            }}
          >
            Get URI
          </Button>
        </main>
      </div>
    </MainLayout>
  );
};

export default Home;
