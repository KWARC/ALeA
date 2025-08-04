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
  saveProblemDraft
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
}

export const VariantDialog = ({
  open,
  onClose,
  problemData,
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
  const [previewProblemData, setPreviewProblemData] = useState<FlatQuizProblem>(null);

  let mcqOptions;
  const STeX = problemData?.problemStex ;
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
  useEffect(() =>{
    if(!problemData)return;
    mcqOptions=problemData?.options||[];
  },[problemData]);

  useEffect(() => {
    const createCopyAndCheckVariants = async () => {
      if (!open || !problemData) return;
      setVariantOptionsLoading(true);
      try {

        console.log({ problemData });
        if (problemData?.manualEdits?.length > 0) {
          setEditableSTeX(problemData.manualEdits[problemData.manualEdits.length - 1]);
        } else {
          setEditableSTeX(problemData.problemStex);
        }
        
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

    createCopyAndCheckVariants();
  }, [open, problemData]);

  useEffect(() => {
    setEditableSTeX(STeX);
  }, [STeX]);

  const saveManualEdit = async () => {
    if (!problemData) {
      console.error('Cannot create variant without problemId');
      return;
    }
    await saveProblemDraft(problemData.problemId, editableSTeX);
  };
  
  const markProblemFinal = async () => {
    if (editableSTeX) await saveProblemDraft(problemData.problemId, editableSTeX);
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
          <Box flex={0.7} display="flex" flexDirection="column" minHeight={0} overflow="hidden">
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
                        setPreviewProblemData(flat);
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
            problemData={previewProblemData ??problemData}
            editableSTeX={editableSTeX}
            setEditableSTeX={setEditableSTeX}
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
