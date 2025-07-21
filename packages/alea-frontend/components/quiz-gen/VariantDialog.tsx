import { getFlamsServer } from '@kwarc/ftml-react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { ExistingProblem, FlatQuizProblem } from '../../pages/quiz-gen';
import { ConfigurationSummary } from './ConfigurationSummary';
import { PreviewSection } from './PreviewSection';
import { SwitchToggle } from './SwitchToggle';
import { VariantConfigSection } from './VariantConfigSection';
import { checkThematicReskin } from '@stex-react/api';

function isFlatQuizProblem(data: FlatQuizProblem | ExistingProblem): data is FlatQuizProblem {
  return (data as FlatQuizProblem).problemId !== undefined;
}

export interface VariantConfig {
  variantTypes: string[];
  difficulty?: string;
  formatType?: string;
  customPrompt: string;
  rephraseInstruction?: string;
  rephraseSubtypes?: string[];
  modifyChoiceMode?: 'add' | 'remove';
  modifyChoiceInstruction?: string;
  conceptualInstruction?: string;
}

interface VariantDialogProps {
  open: boolean;
  onClose: () => void;
  variantConfig: VariantConfig;
  setVariantConfig: React.Dispatch<React.SetStateAction<VariantConfig>>;
  onCreate: (payload: {
    variantTypes: string[];
    difficulty?: string;
    formatType?: string;
    customPrompt?: string;
    rephraseInstruction?: string;
    modifyChoiceInstruction?: string;
    conceptualInstruction?: string;
    shuffleProblemId?: number;
    selectedOptions?: string[];
  }) => void;
  problemData?: FlatQuizProblem | ExistingProblem;
}

export const VariantDialog = ({
  open,
  onClose,
  variantConfig,
  setVariantConfig,
  onCreate,
  problemData,
}: VariantDialogProps) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<'json' | 'stex'>('json');
  const [stex, setStex] = useState(undefined);
  const [editingSTeX, setEditingSTeX] = useState(false);
  const [editableSTeX, setEditableSTeX] = useState('');
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const thematicCache = new Map<string, { canReskin: boolean; themes: string[] }>();//cache for thematic reskinning


  const toggleVariantType = (type: string) => {
    setVariantConfig((prev) => {
      const alreadySelected = prev.variantTypes.includes(type);
      return {
        ...prev,
        variantTypes: alreadySelected
          ? prev.variantTypes.filter((t) => t !== type)
          : [...prev.variantTypes, type],
      };
    });
  };

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
      conceptualInstruction: '',
    });
  };

  async function fetchRawStexFromUri(problemUri: string) {
    const sourceLink = await getFlamsServer().sourceFile({ uri: problemUri });
    if (!sourceLink) return null;

    const rawStexLink = sourceLink.replace('-/blob', '-/raw');
    console.log({ rawStexLink });
    const response = await axios.get(rawStexLink);
    console.log({ response });
    return response.data;
  }

  let problemId: number | undefined;
  let mcqOptions: string[] = [];
  let STeX: string | undefined;
  let problemUri: string | undefined;

  useEffect(() => {
    if (!isFlatQuizProblem(problemData))
      fetchRawStexFromUri(problemData.uri).then((fetchedSTeX) => {
        setStex(fetchedSTeX);
      });
  }, [problemData]);

  useEffect(() => {
  if (!problemData) return;

  const cacheKey = isFlatQuizProblem(problemData)
    ? `id:${problemData.problemId}`
    : `uri:${problemData.uri}`;

  const fetchReskinAvailability = async () => {
    // ✅ Check cache first
    if (thematicCache.has(cacheKey)) {
      const cached = thematicCache.get(cacheKey)!;
      console.log("✅ Loaded from cache:", cached.themes);
      if (cached.canReskin && cached.themes.length) {
        setAvailableThemes(cached.themes); // update UI from cache
      }
      return;
    }

    // ✅ Otherwise call API
    const payload = isFlatQuizProblem(problemData)
      ? { problemId: problemData.problemId }
      : { problemUri: problemData.uri };

    const res = await checkThematicReskin(payload);

    // ✅ Store in cache
    thematicCache.set(cacheKey, { canReskin: res.canReskin, themes: res.themes || [] });

    if (res.canReskin && res.themes?.length) {
      console.log("✅ API result:", res.themes);
      setAvailableThemes(res.themes);
    }
  };

  fetchReskinAvailability();
}, [problemData]);



  if (problemData) {
    if (isFlatQuizProblem(problemData)) {
      problemId = problemData.problemId;
      mcqOptions = problemData.options || [];
      STeX = problemData.problemStex;
      problemUri = problemData.sectionUri;
    } else {
      problemUri = problemData.uri;
      mcqOptions = [];
      STeX = stex;
    }
  }

  useEffect(() => {
    if (variantConfig.variantTypes.includes('options')) {
      setSelectedOptions(mcqOptions);
    }
  }, [variantConfig.variantTypes]);

  useEffect(() => {
    setEditableSTeX(STeX);
  }, [STeX]);

  const handleCreateAndReturn = () => {
    const selectedTypes = variantConfig.variantTypes;
    const payload: any = {
      ...variantConfig,
    };

    if (selectedTypes.includes('options') && problemId) {
      payload.shuffleProblemId = problemId;
      payload.selectedOptions = selectedOptions;
    }

    onCreate(payload);
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
        <Box sx={{ flex: 1, display: 'flex', gap: 2, overflow: 'hidden', minHeight: 0 }}>
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                pr: 1,
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f1f1',
                  borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#c1c1c1',
                  borderRadius: '3px',
                  '&:hover': {
                    background: '#a1a1a1',
                  },
                },
              }}
            >
              <SwitchToggle
                title="Rephrase"
                typeKey="rephrase"
                instructionKey="rephraseInstruction"
                placeholder="e.g., simplify language, keep same meaning"
                variantConfig={variantConfig}
                setVariantConfig={setVariantConfig}
              />

              <SwitchToggle
                title="Modify Choices"
                typeKey="options"
                instructionKey="modifyChoiceInstruction"
                placeholder="e.g., randomize but keep correct answer intact"
                variantConfig={variantConfig}
                setVariantConfig={setVariantConfig}
                mcqOptions={mcqOptions}
                selectedOptions={selectedOptions}
                setSelectedOptions={setSelectedOptions}
              />

              <SwitchToggle
                title="Thematic Reskinning"
                typeKey="conceptual"
                instructionKey="conceptualInstruction"
                placeholder="e.g., apply concept in a real-world scenario"
                variantConfig={variantConfig}
                themes={availableThemes} 
                setVariantConfig={setVariantConfig}
              />

              <VariantConfigSection
                variantConfig={variantConfig}
                setVariantConfig={setVariantConfig}
                toggleVariantType={toggleVariantType}
              />

              <Button
                size="small"
                onClick={clearSelection}
                sx={{
                  color: 'error.main',
                  textTransform: 'none',
                  mb: 2,
                  '&:hover': {
                    bgcolor: 'error.50',
                    color: 'error.dark',
                  },
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
            problemUri={problemUri}
            STeX={STeX}
            editingSTeX={editingSTeX}
            setEditingSTeX={setEditingSTeX}
            editableSTeX={editableSTeX}
            setEditableSTeX={setEditableSTeX}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
        <Button
          onClick={() => {
            console.log('');
          }}
          sx={{ textTransform: 'none' }}
        >
          Start New Edit
        </Button>
        <Button
          onClick={() => {
            console.log('saved as draft');
          }}
          sx={{ textTransform: 'none' }}
        >
          Save As Draft
        </Button>
        <Button
          onClick={() => {
            console.log('Finalize');
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
