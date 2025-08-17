import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import {
  checkPossibleVariants,
  finalizeProblem,
  getProblemVersionHistory,
  saveProblemDraft,
  UserInfo,
} from '@stex-react/api';
import { useEffect, useState } from 'react';
import { FlatQuizProblem } from '../../pages/quiz-gen';
import { ConfigurationSummary } from './ConfigurationSummary';
import { PreviewSection } from './PreviewSection';
import { flattenQuizProblem } from './QuizPanel';
import { SwitchToggle } from './SwitchToggle';
import { VariantConfigSection } from './VariantConfigSection';
import { PRIMARY_COL } from '@stex-react/utils';

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
  userInfo: UserInfo | undefined;
}

export const VariantDialog = ({
  open,
  onClose,
  problemData,
  setProblemData,
  userInfo,
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

  const [previewMode, setPreviewMode] = useState<'json' | 'stex'>('json');
  const [editableSTeX, setEditableSTeX] = useState('');
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [rephraseApplicable, setRephraseApplicable] = useState<boolean>(false);
  const [choicesApplicable, setChoicesApplicable] = useState<boolean>(false);
  const [reskinApplicable, setReskinApplicable] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [variantOptionsLoading, setVariantOptionsLoading] = useState(false);
  const [versions, setVersions] = useState<FlatQuizProblem[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const mcqOptions = problemData?.options || [];
  const STeX = problemData?.problemStex;
  const latestManualEdit = problemData?.manualEdits?.[problemData.manualEdits.length - 1];
  //const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [selectedVersion, setSelectedVersion] = useState<FlatQuizProblem>(null);
  const isViewingLatestVersion = (selectedVersion?.problemId === versions[versions.length - 1]?.problemId) ;
  console.log({isViewingLatestVersion})
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
      //  const processedVersions = history.map((item) =>
      //   (item as any).problemUri ? item: flattenQuizProblem(item)
      // );

      // setVersions(processedVersions);
    };

    fetchProblemVersionHistory();
  }, [problemData, open]);

  useEffect(() => {
    setEditableSTeX(STeX);
  }, [STeX]);

  const saveManualEdit = async () => {
    if (!problemData) {
      console.error('Cannot create variant without problemId');
      return;
    }
    if (latestManualEdit?.editedText === editableSTeX || problemData.problemStex === editableSTeX) {
      console.log('No changes detected. Draft not saved.');
      setSnackbarMessage('No changes detected. Draft not saved.');
      setSnackbarOpen(true);
      return;
    }
    await saveProblemDraft(problemData.problemId, editableSTeX);
    const editEntry = {
      updaterId: userInfo?.userId,
      updatedAt: new Date().toISOString(),
      editedText: editableSTeX,
    };
    if (problemData?.manualEdits) {
      problemData.manualEdits.push(editEntry);
    } else if (problemData) {
      problemData.manualEdits = [editEntry];
    }
  };
  const markProblemFinal = async () => {
    if (latestManualEdit?.editedText !== editableSTeX) {
      await saveProblemDraft(problemData.problemId, editableSTeX);
    }
    await finalizeProblem(problemData.problemId);
  };
  const selectedVersionGenParams = selectedVersion?.generationParams;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          pb: 1,
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'primary.main',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        Create Question Variant
        <Typography variant="subtitle1" fontWeight={500} color="text.secondary">
          Preview
        </Typography>
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
              <>
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  zIndex={10}
                  bgcolor="rgba(255, 255, 255, 0.6)"
                />
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  zIndex={11}
                  bgcolor="white"
                  borderRadius={2}
                  p={2}
                  sx={{
                    border: '2px solid saddlebrown',
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      mb: 1,
                    }}
                  >
                    Generation Params
                  </Typography>

                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Mode:{' '}
                    <Box component="span" sx={{ fontWeight: 400, color: PRIMARY_COL }}>
                      {(selectedVersionGenParams as any)?.mode}
                    </Box>
                  </Typography>
                  {(selectedVersionGenParams as any)?.variantOptions?.theme && (
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      Theme:{' '}
                      <Box component="span" sx={{ fontWeight: 400, color: PRIMARY_COL }}>
                        {(selectedVersionGenParams as any)?.variantOptions?.theme}
                      </Box>
                    </Typography>
                  )}

                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Source Problem Id:{' '}
                    <Box component="span" sx={{ fontWeight: 400 }}>
                      {(selectedVersionGenParams as any)?.sourceProblem.problemId ??
                        (selectedVersionGenParams as any)?.sourceProblem.problemUri}
                    </Box>
                  </Typography>
                </Box>{' '}
              </>
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
                      problemData={problemData}
                      onLoadingChange={setPreviewLoading}
                      onVariantGenerated={(newVariant) => {
                        const flat = flattenQuizProblem(newVariant);
                        setProblemData(flat);
                        setEditableSTeX(flat.problemStex);
                      }}
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
                      problemData={problemData}
                      onLoadingChange={setPreviewLoading}
                      onVariantGenerated={(newVariant) => {
                        const flat = flattenQuizProblem(newVariant);
                        setProblemData(flat);
                        setEditableSTeX(flat.problemStex);
                      }}
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
              <Box display="flex" gap={10} mt={2} p={3}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={clearSelection}
                  sx={{
                    color: 'error.main',
                    borderColor: 'error.main',
                    textTransform: 'none',
                    mb: 2,
                    '&:hover': {
                      bgcolor: 'error.50',
                      borderColor: 'error.dark',
                      color: 'error.dark',
                    },
                  }}
                >
                  Clear Selection
                </Button>

                <Button
                  size="small"
                  variant="contained"
                  onClick={clearSelection}
                  sx={{
                    bgcolor: PRIMARY_COL,
                    textTransform: 'none',
                    mb: 2,
                    '&:hover': { bgcolor: PRIMARY_COL, opacity: 0.9 },
                  }}
                >
                  Create Variant
                </Button>
              </Box>
            </Box>
          </Box>

          <PreviewSection
            previewMode={previewMode}
            setPreviewMode={setPreviewMode}
            problemData={problemData}
            editableSTeX={editableSTeX}
            setEditableSTeX={setEditableSTeX}
            previousVersions={versions}
            onLatestVersionChange={(selectedVersion) =>
              setSelectedVersion(selectedVersion)
            }
          />
        </Box>
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          message={snackbarMessage}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
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
          disabled={!isViewingLatestVersion}
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
          disabled={!isViewingLatestVersion}
          sx={{ textTransform: 'none' }}
        >
          Finalize
        </Button>
      </DialogActions>
    </Dialog>
  );
};
