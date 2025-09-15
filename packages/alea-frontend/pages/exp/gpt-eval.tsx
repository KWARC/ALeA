import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import {
  CreateGptProblemsRequest,
  GptRun,
  Template,
  getGptRuns,
  getTemplates,
} from '@alea/spec';
import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import {
  FixedPositionMenu,
  LayoutWithFixedMenu,
} from '@alea/stex-react-renderer';
import { shouldUseDrawer } from '@alea/utils';
import dayjs from 'dayjs';
import CloseIcon from '@mui/icons-material/Close';
import { GptNavigator, OutputViewer } from './gpt-problems';

function RunsDash({
  runs,
  selectedRunId,
  onClose,
  onRunClick,
}: {
  runs: GptRun[];
  selectedRunId: string;
  onClose: () => void;
  onRunClick: (runId: string) => void;
}) {
  const sortedRuns = [...runs].sort((a, b) => {
    return (
      new Date(b.response.runTime).getTime() -
      new Date(a.response.runTime).getTime() // descending order
    );
  });
  return (
    <FixedPositionMenu
      staticContent={
        <Box display="flex" alignItems="center">
          <IconButton sx={{ m: '2px' }} onClick={() => onClose()}>
            <CloseIcon />
          </IconButton>
        </Box>
      }
    >
      <Box>
        {sortedRuns.map(({ request, response }) => (
          <Box
            key={response.runId}
            onClick={() => onRunClick(response.runId)}
            fontWeight={response.runId === selectedRunId ? 'bold' : undefined}
            fontSize="large"
            p="0 5px"
            sx={{ cursor: 'pointer' }}
          >
            {dayjs(response.runTime).format('MMM-DD HH:mm:ss')} (
            <Typography variant="caption">{request.templateName}</Typography>)
          </Box>
        ))}
      </Box>
    </FixedPositionMenu>
  );
}

function StringMultiSelector({
  name,
  strings,
  selectedStrings,
  onChange,
}: {
  name: string;
  strings: string[];
  selectedStrings: string[];
  onChange: (selectedStrings: string[]) => void;
}) {
  return (
    <FormControl sx={{ minWidth: '120px' }}>
      <InputLabel id="demo-mutiple-name-label">{name}</InputLabel>
      <Select
        labelId="demo-mutiple-name-label"
        id="demo-mutiple-name"
        label={name}
        multiple
        value={selectedStrings}
        onChange={(e) => {
          onChange(e.target.value as string[]);
        }}
      >
        {strings.map((str, index) => (
          <MenuItem key={index} value={str}>
            {str}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
export function KeyValueDisplay({
  dispKey,
  value,
}: {
  dispKey: string;
  value: string;
}) {
  return (
    <span style={{ display: 'block' }}>
      <b>{dispKey}:&nbsp;</b>
      <span style={{ overflowWrap: 'anywhere' }}>{value}</span>
    </span>
  );
}

function InputViewer({ request }: { request: CreateGptProblemsRequest }) {
  return (
    <Box>
      <Typography variant="h5" sx={{ textDecoration: 'underline' }}>
        Input
      </Typography>
      <KeyValueDisplay dispKey="Template Name" value={request.templateName} />
      <KeyValueDisplay dispKey="Version" value={request.templateVersion} />
      <Typography variant="h6" mt="15px" mb="10px">
        Assignments
      </Typography>
      {request.assignments.map((a) => (
        <KeyValueDisplay key={a.key} dispKey={a.key} value={a.value} />
      ))}
    </Box>
  );
}

const GptEval: NextPage = () => {
  const [gptRuns, setGptRuns] = useState<GptRun[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [allRunners, setAllRunners] = useState<string[]>([]);
  const [showDashboard, setShowDashboard] = useState(!shouldUseDrawer());

  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [selectedRunners, setSelectedRunners] = useState<string[]>([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const selectedRun = gptRuns.find(
    (run) => run.response.runId === selectedRunId
  );

  useEffect(() => {
    getGptRuns().then((runs) => {
      setAllRunners([...new Set(runs.map((run) => run.response.runner))]);
      setGptRuns(runs);
    });
  }, []);

  useEffect(() => {
    getTemplates().then(setTemplates);
  }, []);

  const filteredRuns = gptRuns.filter((run) => {
    if (
      selectedTemplates.length &&
      !selectedTemplates.includes(run.request.templateName)
    )
      return false;
    if (
      selectedRunners.length &&
      !selectedRunners.includes(run.response.runner)
    )
      return false;
    return true;
  });

  return (
    <MainLayout title="GPT Problems | ALeA">
      <LayoutWithFixedMenu
        menu={
          <RunsDash
            runs={filteredRuns}
            selectedRunId={selectedRunId}
            onClose={() => setShowDashboard(false)}
            onRunClick={setSelectedRunId}
          />
        }
        topOffset={64}
        showDashboard={showDashboard}
        setShowDashboard={setShowDashboard}
      >
        <Box mt="5px" mb="10px">
          <GptNavigator />
        </Box>
        <Box>
          <Box display="flex" alignItems="center" gap="10px">
            Filters:
            <StringMultiSelector
              name="Templates"
              strings={templates.map((t) => t.templateName)}
              selectedStrings={selectedTemplates}
              onChange={setSelectedTemplates}
            />
            <StringMultiSelector
              name="Runner"
              strings={allRunners}
              selectedStrings={selectedRunners}
              onChange={setSelectedRunners}
            />
          </Box>
          {selectedRun && (
            <>
              <InputViewer request={selectedRun.request} />
              <br />
              <OutputViewer response={selectedRun.response} />
            </>
          )}
        </Box>
      </LayoutWithFixedMenu>
    </MainLayout>
  );
};

export default GptEval;
