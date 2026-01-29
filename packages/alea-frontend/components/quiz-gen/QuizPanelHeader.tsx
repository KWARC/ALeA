import { Folder, PublishedWithChanges } from '@mui/icons-material';
import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import { QuizProblem } from '@alea/spec';
import { getSectionNameFromIdOrUri } from '../../pages/quiz-gen';
import { SecInfo } from '../../types';

interface QuizPanelHeaderProps {
  currentIdx: number;
  totalProblems: number;
  currentProblem: { sectionId: string };
  sections: SecInfo[];
  courseId: string;
  finalizedProblems: QuizProblem[];
  selectedProblemIndex: number | null;
  onVariantChange: (value: number) => void;
  onGoToSection: (courseId: string, sectionId: string) => void;
  onOpenVariantDialog: () => void;
  hideVariantGeneration?: boolean;
}

export function QuizPanelHeader({
  currentIdx,
  totalProblems,
  currentProblem,
  sections,
  courseId,
  finalizedProblems,
  selectedProblemIndex,
  onVariantChange,
  onGoToSection,
  onOpenVariantDialog,
  hideVariantGeneration = false,
}: QuizPanelHeaderProps) {
  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} overflow="auto">
      <Typography variant="h5" color="#0d47a1">
        Question {Math.min(currentIdx, totalProblems - 1) + 1} of {totalProblems}
      </Typography>

      <Tooltip title="Go to this section">
        <Chip
          icon={<Folder style={{ color: '#bbdefb' }} />}
          label={`Section: ${getSectionNameFromIdOrUri(currentProblem.sectionId, sections)}`}
          variant="outlined"
          onClick={() => onGoToSection(courseId, currentProblem.sectionId)}
          clickable
          sx={{
            color: 'primary.10',
            borderColor: 'primary.10',
            fontWeight: 500,
          }}
        />
      </Tooltip>
      {!hideVariantGeneration && (
        <>
          <Tooltip title="Finalized variants of this problem" placement="top">
            <FormControl size="small" sx={{ minWidth: '100px', m: 1 }}>
              <InputLabel>Variants</InputLabel>
              <Select
                value={selectedProblemIndex ?? ''}
                onChange={(e) => onVariantChange(e.target.value as number)}
                label="Variants"
              >
                <MenuItem value={null}>Original</MenuItem>
                {finalizedProblems?.map((variant, idx) => (
                  <MenuItem key={variant.problemId} value={idx}>
                    Variant {idx + 1}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Tooltip>

          <Tooltip title="Create a new Variant">
            <PublishedWithChanges onClick={onOpenVariantDialog} />
          </Tooltip>
        </>
      )}
    </Box>
  );
}
