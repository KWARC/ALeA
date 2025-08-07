import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  TextField,
} from '@mui/material';
import {
  checkPossibleVariants,
  finalizeProblem,
  getProblemVersionHistory,
  saveProblemDraft,
} from '@stex-react/api';
import { useEffect, useState } from 'react';
import { FlatQuizProblem } from '../../pages/quiz-gen';
import { ConfigurationSummary } from './ConfigurationSummary';
import { PreviewSection } from './PreviewSection';
import { flattenQuizProblem } from './QuizPanel';
import { SwitchToggle } from './SwitchToggle';
import { VariantConfigSection } from './VariantConfigSection';

export type VariantType = 'rephrase' | 'modifyChoice' | 'thematicReskin';

export interface VariantConfig {
  variantTypes: VariantType[];
  difficulty?: string;
  formatType?: string;
  customPrompt: string;
  rephraseInstruction?: string;
  rephraseSubtypes?: string[];
  modifyChoiceMode?: 'add' | 'remove';
  modifyChoiceInstruction?: string;
  thematicReskinInstruction?: string;
  selectedTheme?: string;
}

interface VariantDialogProps {
  open: boolean;
  onClose: () => void;
  problemData: FlatQuizProblem;
  setProblemData: (p: FlatQuizProblem | null) => void;
}

export const VariantDialog = ({
  open,
  onClose,
  problemData,
  setProblemData,
}: VariantDialogProps) => {
  const [variantConfig, setVariantConfig] = useState<VariantConfig>({
    variantTypes: [],
    difficulty: '',
    formatType: '',
    customPrompt: '',
    rephraseInstruction: '',
    rephraseSubtypes: [],
    modifyChoiceMode: undefined,
    modifyChoiceInstruction: '',
    thematicReskinInstruction: '',
    selectedTheme: '',
  });

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<'json' | 'stex'>('json');
  const [editableSTeX, setEditableSTeX] = useState('');
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [rephraseApplicable, setRephraseApplicable] = useState<boolean>(false);
  const [choicesApplicable, setChoicesApplicable] = useState<boolean>(false);
  const [reskinApplicable, setReskinApplicable] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [variantOptionsLoading, setVariantOptionsLoading] = useState(false);
  const [versions, setVersions] = useState<FlatQuizProblem[]>([]);

  const mcqOptions = problemData?.options || [];
  const STeX = problemData?.problemStex;
  const latestManualEdit = problemData?.manualEdits?.[problemData.manualEdits.length - 1];
  const isDirty = editableSTeX !== latestManualEdit && editableSTeX !== problemData?.problemStex;
  const [isViewingLatestVersion, setIsViewingLatestVersion] = useState(true);
  console.log({ isViewingLatestVersion });
  const handleConfigChange = (field, value) => {
    setVariantConfig((prev) => ({ ...prev, [field]: value }));
  };

  const clearSelection = () => {
    setVariantConfig({
      variantTypes: [],
      difficulty: '',
      formatType: '',
      customPrompt: '',
      rephraseInstruction: '',
      modifyChoiceInstruction: '',
      thematicReskinInstruction: '',
    });
  };

  useEffect(() => {
    const checkVariants = async () => {
      if (!open || !problemData) return;
      setVariantOptionsLoading(true);
      try {
        console.log({ problemData });

        if (!problemData) return;
        //const result = await checkPossibleVariants(problemData.problemId);
        const result = {
          modify_choices: {
            applicable: true,
          },
          rephrase: {
            applicable: true,
          },
          reskin: {
            applicable: true,
            themes: [
              'Corporate Office Scenario',
              'Library Management System',
              'Hospital Staff Records',
              'University Student Database',
            ],
          },
        };
        setRephraseApplicable(result.rephrase.applicable);
        setChoicesApplicable(result.modify_choices.applicable);
        setReskinApplicable(result.reskin.applicable);
        setAvailableThemes(result.reskin.themes);
      } finally {
        setVariantOptionsLoading(false);
      }
    };

    checkVariants();
  }, [open, problemData]);

  useEffect(() => {
    const fetchProblemVersionHistory = async () => {
      if (!open || !problemData) return;
      const history = await getProblemVersionHistory(problemData.problemId);
      console.log({ res: history });
      const flattenedVersions = history.map(flattenQuizProblem);
      setVersions(flattenedVersions);
    };

    fetchProblemVersionHistory();
  }, [problemData, open]);

  useEffect(() => {
    setEditableSTeX(STeX);
  }, [STeX]);

  // useEffect(() => {
  //   if (!reskinApplicable) return;
  //   setSelectedOptions(mcqOptions);
  // }, [mcqOptions]);

  const saveManualEdit = async () => {
    if (!problemData) {
      console.error('Cannot create variant without problemId');
      return;
    }
    await saveProblemDraft(problemData.problemId, editableSTeX);
    if (problemData?.manualEdits) {
      problemData.manualEdits.push(editableSTeX);
    } else if (problemData) {
      problemData.manualEdits = [editableSTeX];
    }
  };
  const markProblemFinal = async () => {
    if (latestManualEdit !== editableSTeX) {
      await saveProblemDraft(problemData.problemId, editableSTeX);
    }
    await finalizeProblem(problemData.problemId);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          pb: 1,
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'primary.main',
        }}
      >
        Create Question Variant
      </DialogTitle>

      <DialogContent
        sx={{
          height: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {previewLoading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(255,255,255,0.6)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <CircularProgress />
          </Box>
        )}
        <Box display="flex" flex={1} gap={2} minHeight={0} overflow="hidden">
          <Box
            flex={0.7}
            display="flex"
            flexDirection="column"
            minHeight={0}
            overflow="hidden"
            position={'relative'}
          >
            {!isViewingLatestVersion && (
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                zIndex={10}
                bgcolor="rgba(255, 255, 255, 0.6)"
              />
            )}
            <Box
              flex={1}
              overflow="auto"
              pr={1}
              sx={{
                '&::-webkit-scrollbar': { width: '6px' },
                '&::-webkit-scrollbar-track': { background: '#f1f1f1', borderRadius: '3px' },
                '&::-webkit-scrollbar-thumb': {
                  background: '#c1c1c1',
                  borderRadius: '3px',
                  '&:hover': { background: '#a1a1a1' },
                },
              }}
            >
              {variantOptionsLoading ? (
                <LinearProgress />
              ) : (
                <>
                  {rephraseApplicable && (
                    <SwitchToggle
                      title="Rephrase"
                      typeKey="rephrase"
                      instructionKey="rephraseInstruction"
                      placeholder="e.g., simplify language, keep same meaning"
                      variantConfig={variantConfig}
                      setVariantConfig={setVariantConfig}
                      disabled={!isViewingLatestVersion}
                    />
                  )}

                  {choicesApplicable && (
                    <SwitchToggle
                      title="Modify Choices"
                      typeKey="modifyChoice"
                      instructionKey="modifyChoiceInstruction"
                      placeholder="e.g., randomize but keep correct answer intact"
                      variantConfig={variantConfig}
                      setVariantConfig={setVariantConfig}
                      mcqOptions={mcqOptions}
                      selectedOptions={selectedOptions}
                      setSelectedOptions={setSelectedOptions}
                      disabled={!isViewingLatestVersion}
                    />
                  )}

                  {reskinApplicable && (
                    <SwitchToggle
                      title="Thematic Reskinning"
                      typeKey="thematicReskin"
                      instructionKey="thematicReskinInstruction"
                      placeholder="e.g., apply concept in a real-world scenario"
                      variantConfig={variantConfig}
                      themes={availableThemes}
                      setVariantConfig={setVariantConfig}
                      problemData={problemData}
                      onLoadingChange={setPreviewLoading}
                      disabled={!isViewingLatestVersion}
                      onVariantGenerated={(newVariant) => {
                        const flat = flattenQuizProblem(newVariant);
                        setProblemData(flat);
                        setEditableSTeX(flat.problemStex);
                      }}
                    />
                  )}
                </>
              )}
              <VariantConfigSection
                variantConfig={variantConfig}
                setVariantConfig={setVariantConfig}
              />

              <Button
                size="small"
                onClick={clearSelection}
                sx={{
                  color: 'error.main',
                  textTransform: 'none',
                  mb: 2,
                  '&:hover': { bgcolor: 'error.50', color: 'error.dark' },
                }}
              >
                Clear All Selection
              </Button>

              <TextField
                label="Pretext Instructions (optional)"
                placeholder="e.g., general notes for all variants"
                value={variantConfig.customPrompt}
                onChange={(e) => handleConfigChange('customPrompt', e.target.value)}
                fullWidth
                multiline
                minRows={3}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': { borderRadius: 2 },
                }}
              />

              <ConfigurationSummary variantConfig={variantConfig} />
            </Box>
          </Box>

          <PreviewSection
            previewMode={previewMode}
            setPreviewMode={setPreviewMode}
            problemData={problemData}
            editableSTeX={editableSTeX}
            setEditableSTeX={setEditableSTeX}
            previousVersions={versions}
            onLatestVersionStatusChange={(isLatest) => setIsViewingLatestVersion(isLatest)}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button
          onClick={() => {
            clearSelection();
            onClose();
          }}
          sx={{ textTransform: 'none' }}
        >
          Start New Edit
        </Button>
        <Button
          onClick={async () => {
            await saveManualEdit();
            clearSelection();
          }}
          disabled={!isDirty}
          sx={{ textTransform: 'none' }}
        >
          Save As Draft
        </Button>
        <Button
          onClick={async () => {
            await markProblemFinal();
            clearSelection();
            onClose();
          }}
          sx={{ textTransform: 'none' }}
        >
          Finalize
        </Button>
      </DialogActions>
    </Dialog>
  );
};
