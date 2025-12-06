import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CompletionEval,
  LikertLabels,
  LikertRating,
  LikertScaleSize,
  LikertType,
  ProblemEval,
  Tristate,
} from '@alea/spec';
import { Fragment, useEffect, useState } from 'react';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';

const TriStateCheckbox = ({
  value,
  label,
  onChange,
}: {
  value?: Tristate;
  label: string;
  onChange: (value: Tristate) => void;
}) => {
  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={value === Tristate.TRUE}
          indeterminate={!value || value === Tristate.UNKNOWN}
          checkedIcon={<CheckBoxIcon htmlColor="green" />}
          indeterminateIcon={<HelpCenterIcon htmlColor="orange" />}
          icon={<CancelRoundedIcon htmlColor="red" />}
          onChange={() => {
            switch (value) {
              case Tristate.TRUE:
                onChange(Tristate.FALSE);
                break;
              case Tristate.FALSE:
                onChange(Tristate.UNKNOWN);
                break;
              case Tristate.UNKNOWN:
              default:
                onChange(Tristate.TRUE);
                break;
            }
          }}
        />
      }
      label={label}
    />
  );
};

function interpolateColor(i, scaleSize) {
  const ratio = i / (scaleSize - 1);
  const hue = Math.round(120 * ratio); // interpolate between red (0) and green (120)
  const l = 25 + Math.round(15 * (1 - ratio)); // interpolate between red (25) and green (40)
  return `hsl(${hue}, 100%, ${l}%)`;
}

function LikertInput({
  title,
  type,
  rating,
  onChange,
}: {
  title: string;
  type: LikertType;
  rating?: LikertRating;
  onChange: (r: LikertRating) => void;
}) {
  const scaleSize = LikertScaleSize[type];

  return (
    <Box mb="10px">
      <Typography variant="body1" fontWeight="bold">
        {title}
      </Typography>
      {Array(scaleSize)
        .fill(0)
        .map((_, i) => (
          <Fragment key={i}>
            {scaleSize === 7 && i === 3 && <br />}
            <Tooltip title={LikertLabels[type][i]}>
              <Button
                sx={{
                  fontWeight: i + 1 === rating?.value ? 'bold' : undefined,
                  fontSize: 'small',
                  color: interpolateColor(i, scaleSize),
                  border:
                    i + 1 === rating?.value ? '1px solid #CCC' : undefined,
                }}
                onClick={() =>
                  onChange({
                    scaleSize: scaleSize as any,
                    value: (i + 1) as any,
                    label: LikertLabels[type][i],
                  })
                }
              >
                {LikertLabels[type][i]}
              </Button>
            </Tooltip>
            {scaleSize === 7 && i === 3 && <br />}
          </Fragment>
        ))}
    </Box>
  );
}

function ProblemEvalForm({
  problemEval,
  onChange,
}: {
  problemEval: ProblemEval;
  onChange: (pEval: ProblemEval) => void;
}) {
  return (
    <Box mb={2}>
      <TextField
        label="Problem Descriptive Evaluation"
        value={problemEval.textDescription || ''}
        onChange={({ target }) =>
          onChange({ ...problemEval, textDescription: target.value })
        }
        name="textDescription"
        fullWidth
      />
      <br />
      <LikertInput
        title="How relevant is the problem to the provided material?"
        type="relevant"
        rating={problemEval.relevanceToMaterial}
        onChange={(relevanceToMaterial) =>
          onChange({ ...problemEval, relevanceToMaterial })
        }
      />
      <LikertInput
        title="How difficult is the problem?"
        type="difficult"
        rating={problemEval.difficulty}
        onChange={(difficulty) => onChange({ ...problemEval, difficulty })}
      />
      <LikertInput
        title="How useful is the problem for learning?"
        type="useful"
        rating={problemEval.useful}
        onChange={(useful) => onChange({ ...problemEval, useful })}
      />

      <LikertInput
        title="Is the problem appropriate for the provided objectives?"
        type="appropriate"
        rating={problemEval.appropriateForObjective}
        onChange={(appropriateForObjective) =>
          onChange({ ...problemEval, appropriateForObjective })
        }
      />
      <Typography variant="h5">Correctness</Typography>
      <TriStateCheckbox
        value={problemEval?.doesCompile}
        label="Does compile"
        onChange={(value) => onChange({ ...problemEval, doesCompile: value })}
      />
      <TriStateCheckbox
        value={problemEval?.languageCorrect}
        label="Is language correct"
        onChange={(value) =>
          onChange({ ...problemEval, languageCorrect: value })
        }
      />
      <br />
      <TextField
        label="Num Content Errors"
        type="number"
        value={problemEval.numContentErrors || ''}
        onChange={({ target }) =>
          onChange({ ...problemEval, numContentErrors: +target.value })
        }
        name="numContentErrors"
        sx={{ mb: 2 }}
      />
      <br />
      <LikertInput
        title="Is the problem ambiguous?"
        type="ambiguous"
        rating={problemEval.ambiguous}
        onChange={(ambiguous) => onChange({ ...problemEval, ambiguous })}
      />
      <br />
      <TextField
        label="Num Missed Annotations"
        type="number"
        value={problemEval.numMissedAnnotations || ''}
        onChange={({ target }) =>
          onChange({ ...problemEval, numMissedAnnotations: +target.value })
        }
        name="numMissedAnnotations"
        sx={{ mr: 2 }}
      />

      <TextField
        label="Num Wrong Annotations"
        type="number"
        value={problemEval.numWrongAnnotations || ''}
        onChange={({ target }) =>
          onChange({ ...problemEval, numWrongAnnotations: +target.value })
        }
        name="numWrongAnnotations"
      />
      <br />
      <br />
      <TextField
        label="Missed Imports"
        type="number"
        value={problemEval.numMissedImports || ''}
        onChange={({ target }) =>
          onChange({ ...problemEval, numMissedImports: +target.value })
        }
        name="numMissedImports"
        sx={{ mr: 2 }}
      />

      <TextField
        label="Wrong Imports"
        type="number"
        value={problemEval.numWrongImports || ''}
        onChange={({ target }) =>
          onChange({ ...problemEval, numWrongImports: +target.value })
        }
        name="numWrongImports"
      />
      <br />
      <TextField
        label="Corrected Problem"
        type="number"
        value={problemEval.fixedProblem || ''}
        onChange={({ target }) =>
          onChange({ ...problemEval, fixedProblem: target.value })
        }
        name="fixedProblem"
        sx={{ mt: 2 }}
        fullWidth
        multiline
      />
    </Box>
  );
}

function CompletionEvalForm({
  runId,
  completionIdx,
  initial,
  onSubmit,
}: {
  runId: string;
  completionIdx: number;
  initial: CompletionEval;
  onSubmit: (completionEval: CompletionEval) => void;
}) {
  const [numProblems, setNumProblems] = useState(1);
  const [textDescription, setTextDescription] = useState('');
  const [problemEvals, setProblemEvals] = useState<ProblemEval[]>([]);

  useEffect(() => {
    setTextDescription(initial?.textDescription ?? '');
    setNumProblems(initial?.problemEvals?.length ?? 1);
    setProblemEvals(initial?.problemEvals ?? [{}]);
  }, [initial]);

  useEffect(() => {
    setProblemEvals((existingQ) => {
      const toAdd = numProblems - existingQ.length;
      if (toAdd > 0) {
        return [...existingQ, ...Array.from({ length: toAdd }, () => ({}))];
      } else if (toAdd < 0) {
        return existingQ.slice(0, numProblems);
      }
      return existingQ;
    });
  }, [numProblems]);

  const handleQEvalChange = (index: number, problem: ProblemEval) => {
    const newEvals = [...problemEvals];
    newEvals[index] = problem;
    setProblemEvals(newEvals);
  };

  return (
    <Box>
      <Typography variant="h5" mt={2} sx={{ textDecoration: 'underline' }}>
        Evaluation
      </Typography>
      Evaluation Version: {initial?.version ?? ''}
      <Box my={2}>
        <TextField
          label="Overall descriptive evaluation"
          value={textDescription}
          onChange={(e) => setTextDescription(e.target.value)}
          fullWidth
        />
      </Box>
      <Box mb={2}>
        <TextField
          label="Number of Problems"
          type="number"
          value={numProblems}
          onChange={(e) => setNumProblems(parseInt(e.target.value) ?? 1)}
        />
      </Box>
      {problemEvals.map((problemEval, index) => (
        <Fragment key={index}>
          <Typography variant="h6" mb={2}>
            Evaluation for problem {index + 1}
          </Typography>
          <ProblemEvalForm
            problemEval={problemEval}
            onChange={(newEval) => handleQEvalChange(index, newEval)}
          />
        </Fragment>
      ))}
      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          const completionEval: CompletionEval = {
            runId,
            completionIdx,
            textDescription,
            problemEvals,
            version: 'unused',
            evaluator: 'unused',
            updateTime: 'unused',
          };
          onSubmit(completionEval);
        }}
      >
        Submit
      </Button>
    </Box>
  );
}

export default CompletionEvalForm;
