import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SettingsIcon from '@mui/icons-material/Settings';
import WarningIcon from '@mui/icons-material/Warning';
import { Box, Button, IconButton } from '@mui/material';
import { BloomDimension } from '@alea/spec';
import { MystEditor } from '@alea/myst';
import { SelfAssessment2 } from '@alea/stex-react-renderer';
import { localStore } from '@alea/utils';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { SearchBar } from '../../components/SearchBar';
import MainLayout from '../../layouts/MainLayout';

function ExternalButtonLink({ href, text }: { href: string; text: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      <Button variant="contained" sx={{ m: '5px' }}>
        {text}
        <OpenInNewIcon />
      </Button>
    </a>
  );
}

function InternalButtonLink({ href, children }: any) {
  return (
    <Link href={href}>
      <Button variant="contained" sx={{ m: '5px' }}>
        {children}
      </Button>
    </Link>
  );
}

const ExperimentsHome: NextPage = () => {
  const [value, setValue] = useState('# This is a Myst Test\n\n**Math** works: $E=mc^2$.');
  return (
    <MainLayout title="Experiments | ALeA">
      <IconButton sx={{ float: 'right' }}>
        <Link href="/settings">
          <SettingsIcon />
        </Link>
      </IconButton>
      <Box textAlign="center" m="20px">
        <h1>ALeA Experiments</h1>
        <i>
          Enter at your own risk!
          <WarningIcon sx={{ mt: '-10px', color: '#e20', transform: 'translateY(5px)' }} />
        </i>
      </Box>
      <div>
        <main style={{ margin: '10px' }}>
          <Box m="10px auto" maxWidth="600px" textAlign="center">
            <Box>
              <InternalButtonLink href="/sys-admin">System Administrator</InternalButtonLink>
              <InternalButtonLink href="/lo-explorer">Learning Objects Explorer</InternalButtonLink>
              <InternalButtonLink href="/exp/mathhub-query">
                MathHub Query Interface
              </InternalButtonLink>
              <InternalButtonLink href="/positiondata">
                Concept Position Tracking
              </InternalButtonLink>
              <InternalButtonLink href="/job-portal">Job Portal</InternalButtonLink>
            </Box>
            <Box>
              <h2>Paper Prototypes (What we are working towards)</h2>
              <Box display="flex">
                <InternalButtonLink href="/course_lm_exp/ai_structure.html">
                  Course Structure
                </InternalButtonLink>
                <InternalButtonLink href="/course_lm_exp/lm_visualising_1.html">
                  Course Structure with Learner Model
                </InternalButtonLink>
                <InternalButtonLink href="/course_lm_exp/lm_visualising_2.html">
                  Course Structure with Learner Model 2
                </InternalButtonLink>
              </Box>
              <br />
              <InternalButtonLink href="/exp/pp_dialogue_tour">
                Dialogue Guided Tour
              </InternalButtonLink>
              <InternalButtonLink href="/exp/pp_teachers_and_tas">
                Cohort overview
              </InternalButtonLink>
              <InternalButtonLink href="/exp/pp_students">
                Student competency assessment
              </InternalButtonLink>

              <InternalButtonLink href="/visualization">Visualization Demo</InternalButtonLink>
            </Box>
            <Box>
              <h2>Debug</h2>
              <InternalButtonLink href="/exp/gpt-problems">GPT Problems page</InternalButtonLink>
              <InternalButtonLink href="/debug-section">Debug Document Sections</InternalButtonLink>
              <InternalButtonLink href="/file-browser">Article browser</InternalButtonLink>
              <Button
                variant="contained"
                onClick={() => {
                  if (localStore?.getItem('traffic-light')) {
                    localStore.removeItem('traffic-light');
                    alert('Traffic light disabled');
                  } else {
                    localStore.setItem('traffic-light', 'true');
                    alert('Traffic light enabled');
                  }
                  window.location.reload();
                }}
              >
                {localStore?.getItem('traffic-light') ? 'Disable ' : 'Enable '}
                Traffic Light
              </Button>
            </Box>
            <Box>
              <h2>System Info</h2>
              FLAMS server: {process.env.NEXT_PUBLIC_FLAMS_URL}
              <br />
              LMP server: {process.env.NEXT_PUBLIC_LMP_URL}
              <br />
              Auth server: {process.env.NEXT_PUBLIC_AUTH_SERVER_URL}
            </Box>
            <Box>
              <h2>ALᴇA Servers</h2>
              <ExternalButtonLink href="https://courses.voll-ki.fau.de" text="Production" />
              <ExternalButtonLink href="https://courses-staging.kwarc.info" text="Staging" />
            </Box>
            <Box>
              <h2>FLAMS Servers</h2>
              <ExternalButtonLink href="https://mathhub.info" text="Production" />
              <ExternalButtonLink
                href="https://building.beta.vollki.kwarc.info/:sTeX"
                text="(Unstable!) Building (building.beta...)"
              />
            </Box>
            &nbsp;&nbsp;
            <SearchBar />
            <Box m="10px" width="fit-content">
              <SelfAssessment2
                dims={[
                  BloomDimension.Remember,
                  BloomDimension.Understand,
                  BloomDimension.Apply,
                  BloomDimension.Analyse,
                  BloomDimension.Evaluate,
                  BloomDimension.Create,
                ]}
                uri={''}
              />
            </Box>
          </Box>
          <MystEditor
            name="sample-edit"
            value={value}
            onValueChange={setValue}
            defaultPreview={true}
          />
        </main>
      </div>
    </MainLayout>
  );
};

export default ExperimentsHome;
