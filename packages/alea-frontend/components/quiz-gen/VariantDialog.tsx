import {
  checkPossibleVariants,
  finalizeProblem,
  getProblemVersionHistory,
  saveProblemDraft,
  UserInfo,
} from '@alea/spec';
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
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { FlatQuizProblem } from '../../pages/quiz-gen';
import { GenerationParams } from './GenerationParams';
import { PreviewSection } from './PreviewSection';
import { flattenQuizProblem } from './QuizPanel';
import { MinorEditType, SwitchToggle } from './SwitchToggle';
import { Translate } from './Translate';

export type VariantType = 'minorEdit' | 'modifyChoice' | 'thematicReskin' | 'scaffolding';
export interface VariantConfig {
  variantTypes: VariantType[];
  minorEditInstruction?: string;
  minorEditSubtypes?: MinorEditType;
  modifyChoiceMode?: 'add' | 'replace';
  modifyChoiceInstruction?: string;
  thematicReskinInstruction?: string;
  selectedTheme?: string;
}
export interface ScaffoldingDetails {
  high: {
    applicable: boolean;
    numSubQuestions: number;
  };
  reduced: {
    applicable: boolean;
  };
}
interface VariantDialogProps {
  open: boolean;
  onClose: () => void;
  problemData: FlatQuizProblem;
  setProblemData: (p: FlatQuizProblem | null) => void;
  userInfo: UserInfo | undefined;
}
export const MINOR_EDIT_KEYS: MinorEditType[] = [
  'change_data_format',
  'change_goal',
  'goal_inversion',
  'convert_units',
  'negate_question_stem',
  'substitute_values',
];
export const VariantDialog = ({
  open,
  onClose,
  problemData,
  setProblemData,
  userInfo,
}: VariantDialogProps) => {
  const [variantConfig, setVariantConfig] = useState<VariantConfig>({
    variantTypes: [],
    minorEditInstruction: '',
    minorEditSubtypes: undefined,
    modifyChoiceMode: undefined,
    modifyChoiceInstruction: '',
    thematicReskinInstruction: '',
    selectedTheme: '',
  });

  const [previewMode, setPreviewMode] = useState<'json' | 'stex'>('json');
  const [editableSTeX, setEditableSTeX] = useState('');
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [scaffoldingDetails, setScaffoldingDetails] = useState<ScaffoldingDetails>(null);
  const [availabledMinorEdits, setAvailableMinorEdits] = useState<MinorEditType[] | []>([]);
  const [minorEditsApplicable, setMinorEditsApplicable] = useState<boolean>(false);
  const [choicesApplicable, setChoicesApplicable] = useState<boolean>(false);
  const [reskinApplicable, setReskinApplicable] = useState<boolean>(false);
  const [scaffoldingApplicable, setScaffoldingApplicable] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [variantOptionsLoading, setVariantOptionsLoading] = useState(false);
  const [versions, setVersions] = useState<FlatQuizProblem[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [currentLang, setCurrentLang] = useState(undefined);
  const [resetKey, setResetKey] = useState(0);
  const STeX = problemData?.problemStex;
  const latestManualEdit = problemData?.manualEdits?.[problemData.manualEdits.length - 1];
  const [isViewingLatestVersion, setisViewingLatestVersion] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<FlatQuizProblem>(null);

  const clearSelection = () => {
    setVariantConfig({
      variantTypes: [],
      minorEditInstruction: '',
      modifyChoiceInstruction: '',
      thematicReskinInstruction: '',
    });
    setResetKey((prev) => prev + 1);
  };

  useEffect(() => {
    const checkVariants = async () => {
      if (!open || !problemData) return;
      setVariantOptionsLoading(true);
      try {
        if (!problemData) return;
        const result = await checkPossibleVariants(problemData.problemId);
        const availableMinorEdits = MINOR_EDIT_KEYS.filter((key) => result[key]);
        const isHighScaffoldingApplicable =
          result.scaffolding?.high?.applicable && result.scaffolding?.high.numSubQuestions > 0;
        const isReducedScaffoldingApplicable = result.scaffolding?.reduced?.applicable;
        setMinorEditsApplicable(availableMinorEdits.length > 0);
        setAvailableMinorEdits(availableMinorEdits);
        setChoicesApplicable(result.modify_choices);
        setReskinApplicable(result.reskin.applicable && result.reskin?.themes?.length > 0);
        setScaffoldingApplicable(isHighScaffoldingApplicable || isReducedScaffoldingApplicable);
        setScaffoldingDetails(result.scaffolding);
        setAvailableThemes(result.reskin.themes);
        setCurrentLang(result.current_question_language);
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
      const flattenedVersions = history.map(flattenQuizProblem);
      setVersions(flattenedVersions);
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
      setSnackbarMessage('Draft Saved! No Manual changes detected.');
      setSnackbarOpen(true);
      return;
    }
    await saveProblemDraft(problemData.problemId, editableSTeX);
    setSnackbarMessage('Draft Saved!');
    setSnackbarOpen(true);
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

  const existingProblemUri = selectedVersion?.problemUri;
  const selectedVersionGenParams = selectedVersion?.generationParams ?? existingProblemUri;

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
        <Box
          display="flex"
          flex={1}
          gap={2}
          minHeight={0}
          overflow="hidden"
          flexDirection={{ xs: 'column', md: 'row' }}
        >
          <Box
            flex={{ xs: '1 1 auto', md: 0.4 }}
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
                  bgcolor="rgba(255, 255, 255, 1)"
                />
                {selectedVersionGenParams && (selectedVersionGenParams as any)?.mode !== 'copy' && (
                  <GenerationParams
                    genParams={selectedVersionGenParams}
                    existingProblemUri={existingProblemUri}
                  />
                )}
              </>
            )}
            <Box flex={1} pr={1} overflow="auto">
              {variantOptionsLoading ? (
                <LinearProgress />
              ) : (
                <>
                  {minorEditsApplicable && (
                    <SwitchToggle
                      title="Minor Edit"
                      typeKey="minorEdit"
                      instructionKey="minorEditInstruction"
                      placeholder="e.g., simplify language, keep same meaning"
                      variantConfig={variantConfig}
                      setVariantConfig={setVariantConfig}
                      availableMinorEdits={availabledMinorEdits}
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
                      placeholder="e.g., Change the context"
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
                  {/*
                  //TODO next step
                   {scaffoldingApplicable && (
                    <SwitchToggle
                      title="Scaffold"
                      typeKey="scaffolding"
                      instructionKey="scaffoldingInstruction"
                      variantConfig={variantConfig}
                      scaffoldingDetails={scaffoldingDetails}
                      setVariantConfig={setVariantConfig}
                      problemData={problemData}
                      onLoadingChange={setPreviewLoading}
                      onVariantGenerated={(newVariant) => {
                        const flat = flattenQuizProblem(newVariant);
                        setProblemData(flat);
                        setEditableSTeX(flat.problemStex);
                      }}
                    />
                  )} */}
                </>
              )}
              {currentLang && (
                <Translate
                  key={resetKey}
                  problemData={problemData}
                  onLoadingChange={setPreviewLoading}
                  language={currentLang}
                  onTranslated={(newVariant) => {
                    const flat = flattenQuizProblem(newVariant);
                    setProblemData(flat);
                    setEditableSTeX(flat.problemStex);
                  }}
                />
              )}
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
            </Box>
          </Box>
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={3000}
            onClose={() => setSnackbarOpen(false)}
            message={snackbarMessage}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          />
          <Box
            flex={{ xs: '1 1 auto', md: 0.7 }}
            display="flex"
            flexDirection="column"
            minHeight={0}
            overflow="hidden"
          >
            <PreviewSection
              previewMode={previewMode}
              setPreviewMode={setPreviewMode}
              problemData={problemData}
              editableSTeX={editableSTeX}
              setEditableSTeX={setEditableSTeX}
              previousVersions={versions}
              isLatest={(isLatestVersion) => setisViewingLatestVersion(isLatestVersion)}
              onLatestVersionChange={(selectedVersion) => setSelectedVersion(selectedVersion)}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={() => {
            clearSelection();
            onClose();
          }}
        >
          Close
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
