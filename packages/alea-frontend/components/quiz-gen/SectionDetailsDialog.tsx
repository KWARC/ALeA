import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
} from '@mui/material';
import {
  conceptUriToName,
  generateQuizProblems,
  getConceptPropertyInSection,
  getDefiniedaInSection,
  getSectionGoals,
} from '@stex-react/api';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { FlatQuizProblem } from '../../pages/quiz-gen';
import { SecInfo } from '../../types';
import { ConceptDetails } from './ConceptDetails';
import { ConceptSelector } from './ConceptSelector';
import { getSectionRange } from './CourseSectionSelector';
import { GenerationSummary } from './GenerationSummary';
import { GoalSelector } from './GoalSelector';
import { QuestionTypeSelector } from './QuestionTypeSelector';
import { SelectedConcept } from './SelectedConcept';

interface ConceptPropertiesMap {
  [conceptUri: string]: ConceptProperty[];
}

export interface ConceptProperty {
  description?: string;
  prop: string;
}

export interface QuestionType {
  id: string;
  label: string;
  description: string;
}

export interface Goal {
  uri: string;
  text: string;
  subGoalUris?: string[];
}
export interface GoalNode {
  text: string;
  uri: string;
  subGoals: GoalNode[];
}
export interface SectionGoals {
  [allGoals: string]: GoalNode[];
}

interface SectionDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  startSectionUri: string;
  endSectionUri: string;
  sections: SecInfo[];
  setGeneratedProblems: Dispatch<SetStateAction<FlatQuizProblem[]>>;
  setLatestGeneratedProblems: Dispatch<SetStateAction<FlatQuizProblem[]>>;
}

export const SectionDetailsDialog: React.FC<SectionDetailsDialogProps> = ({
  open,
  onClose,
  courseId,
  startSectionUri,
  endSectionUri,
  sections,
  setGeneratedProblems,
  setLatestGeneratedProblems,
}) => {
  const [concepts, setConcepts] = useState<{ label: string; value: string }[]>([]);
  const [selectedConcepts, setSelectedConcepts] = useState<{ label: string; value: string }[]>([]);
  const [conceptProperties, setConceptProperties] = useState<ConceptPropertiesMap>({});
  const [selectedProperties, setSelectedProperties] = useState<{ [conceptUri: string]: string[] }>(
    {}
  );
  const [sectionGoals, setSectionGoals] = useState<SectionGoals>({});
  const [selectedGoals, setSelectedGoals] = useState<{ [conceptUri: string]: string[] }>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const questionTypes = [
    {
      id: 'mcq',
      label: 'Multiple Choice Questions (MCQ)',
      description: 'Questions with multiple correct answers',
    },
    {
      id: 'scq',
      label: 'Single Choice Questions (SCQ)',
      description: 'Questions with only one correct answer',
    },
    {
      id: 'fill-blanks',
      label: 'Fill in the Blanks',
      description: 'Complete the missing words or phrases',
    },
  ];

  const allSelected = concepts.length > 0 && selectedConcepts.length === concepts.length;
  const someSelected = selectedConcepts.length > 0 && selectedConcepts.length < concepts.length;

  const GoalJsonFormat = (allGoals: Goal[], topLevelGoalUris: string[]): SectionGoals => {
    const trees = buildTrees(topLevelGoalUris, allGoals);
    const sectionUri = startSectionUri;
    return { [sectionUri]: trees };
  };
  //TODO: add option to avoid maximum stack size exceeded
  function createHierarchy(goalUri: string, allGoals: Goal[]): GoalNode {
    const g = allGoals.find((goal) => goal.uri === goalUri);
    if (!g) {
      return { text: '', uri: goalUri, subGoals: [] };
    }

    const newNode: GoalNode = {
      text: g.text,
      uri: g.uri,
      subGoals: [],
    };

    for (const cUri of g.subGoalUris || []) {
      const cNode = createHierarchy(cUri, allGoals);
      if (cNode?.text || cNode?.subGoals?.length) {
        newNode.subGoals.push(cNode);
      }
    }

    return newNode;
  }

  function buildTrees(topLevelGoalUris: string[], allGoals: Goal[]): GoalNode[] {
    return topLevelGoalUris.map((uri) => createHierarchy(uri, allGoals)).filter((n) => n !== null);
  }

  useEffect(() => {
    async function getAllGoals() {
      console.log('HI');

      //TODO use courseUri instead of courseId
      const iwgs2_course_uri =
        'https://mathhub.info?a=courses/FAU/IWGS/course&p=course/notes&d=notes-part2&l=en';
      const current_section_uri = startSectionUri;
      const { allGoals, topLevelGoalUris } = await getSectionGoals(
        iwgs2_course_uri,
        current_section_uri
      );
      const transformed = GoalJsonFormat(allGoals, topLevelGoalUris);
      setSectionGoals(transformed);
      console.log({ allGoals });
      console.log({ topLevelGoalUris });
      const trees = buildTrees(topLevelGoalUris, allGoals);
      console.log('TREEs', trees);
    }

    getAllGoals();
  }, [courseId, open]); //TODO add courseURi here in dependancy array

  useEffect(() => {
    setCurrentIndex(selectedConcepts.length > 0 ? 0 : -1);
  }, [selectedConcepts]);

  const handleToggleAll = () => {
    setSelectedConcepts(allSelected ? [] : concepts);
  };
  useEffect(() => {
    if (!startSectionUri || !endSectionUri) return;
    setConcepts([]);
    setSelectedConcepts([]);
    setSelectedProperties({});
    setSelectedGoals({});
  }, [startSectionUri, endSectionUri, setGeneratedProblems]);

  useEffect(() => {
    if (!open || !startSectionUri || !endSectionUri || !sections?.length) return;

    const fetchConcepts = async () => {
      setLoading(true);
      try {
        const rangeSections = getSectionRange(startSectionUri, endSectionUri, sections);
        const allUris: string[] = [];

        for (const sec of rangeSections) {
          const properties = await getConceptPropertyInSection(sec.uri);
          setConceptProperties((prev) => ({ ...prev, ...properties }));

          const defs = await getDefiniedaInSection(sec.uri);
          allUris.push(...defs.map((c) => c.conceptUri));
        }

        const uniqueUris = [...new Set(allUris)];
        setConcepts(
          uniqueUris.map((uri) => ({ label: `${conceptUriToName(uri)} (${uri})`, value: uri }))
        );
      } catch (err) {
        console.error('Error fetching concepts in range:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConcepts();
  }, [open, startSectionUri, endSectionUri, sections]);

  const generateNewProblems = async () => {
    setGenerating(true);

    try {
      const response = await generateQuizProblems({
        mode: 'new',
        courseId,
        startSectionUri,
        endSectionUri,
        selectedGoals,
        selectedConcepts: selectedConcepts.map((sc) => ({
          name: sc.label,
          uri: sc.value,
          properties: (selectedProperties[sc.value] || [])
            .map((d) => d.replace(/-\d+$/, ''))
            .filter((d) => !d.startsWith('http')),
        })),
        selectedQuestionTypes,
      });
      if (!response?.length) {
        return;
      }
      const parsedProblems: FlatQuizProblem[] = response.map(({ problemJson, ...rest }) => ({
        ...rest,
        ...problemJson,
      }));
      setLatestGeneratedProblems(parsedProblems);
      setGeneratedProblems((prev) => [...prev, ...parsedProblems]);
      onClose?.();
    } catch (error) {
      console.error(' Error generating problems:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleRemoveConcept = (conceptValue: string) => {
    setSelectedConcepts((prev) => {
      const newConcepts = prev.filter((c) => c.value !== conceptValue);
      setCurrentIndex((idx) => Math.min(idx, newConcepts.length - 1));
      return newConcepts;
    });
  };

  const handleSelectConcept = (concept: { value: string; label: string }) => {
    setSelectedConcepts((prev) => {
      const exists = prev.some((sc) => sc.value === concept.value);
      if (exists) {
        const newConcepts = prev.filter((sc) => sc.value !== concept.value);
        setCurrentIndex((idx) => Math.min(idx, newConcepts.length - 1));
        return newConcepts;
      } else {
        const newConcepts = [concept, ...prev];
        setCurrentIndex(0);
        return newConcepts;
      }
    });
  };

  const handleToggleAllQuestionTypes = () => {
    if (selectedQuestionTypes.length === questionTypes.length) {
      setSelectedQuestionTypes([]);
    } else {
      setSelectedQuestionTypes(questionTypes.map((qt) => qt.id));
    }
  };

  const handleSelectQuestionType = (questionTypeId: string) => {
    setSelectedQuestionTypes((prev) => {
      const exists = prev.includes(questionTypeId);
      return exists ? prev.filter((id) => id !== questionTypeId) : [...prev, questionTypeId];
    });
  };

  const handleSelectAllProperties = (conceptUri: string) => {
    const allProps = (conceptProperties[conceptUri] ?? []).map(
      (p, idx) => `${p.description}-${idx}`
    );
    setSelectedProperties((prev) => ({ ...prev, [conceptUri]: allProps }));
  };

  const handleClearAllProperties = (conceptUri: string) => {
    setSelectedProperties((prev) => ({ ...prev, [conceptUri]: [] }));
  };

  const handleToggleProperty = (conceptUri: string, description: string, idx: number) => {
    setSelectedProperties((prev) => {
      const currentProps = prev[conceptUri] ?? [];
      const uniqueKey = `${description}-${idx}`;
      const isSelected = currentProps.includes(uniqueKey);
      const newProps = isSelected
        ? currentProps.filter((p) => p !== uniqueKey)
        : [...currentProps, uniqueKey];
      return { ...prev, [conceptUri]: newProps };
    });
  };

  const handleRemoveGoal = (conceptUri: string, goalUri: string) => {
    setSelectedGoals((prev) => ({
      ...prev,
      [conceptUri]: prev[conceptUri]?.filter((g) => g !== goalUri) ?? [],
    }));
  };

  const collectAllGoalDescriptions = (goals: GoalNode[]): string[] => {
    return goals.flatMap((goal) => [goal.text, ...collectAllGoalDescriptions(goal.subGoals || [])]);
  };

  const handleToggleAllGoals = (sectionUri: string) => {
    const currentSectionGoals = sectionGoals[sectionUri] || [];
    const allGoalTexts = collectAllGoalDescriptions(currentSectionGoals);
    setSelectedGoals((prev) => ({
      ...prev,
      [sectionUri]: prev[sectionUri]?.length === allGoalTexts.length ? [] : allGoalTexts,
    }));
  };

  const handleSelectGoal = (sectionUri: string, goalUri: string, goalText: string) => {
    setSelectedGoals((prev) => {
      const sectionArray = prev[sectionUri] || [];
      return {
        ...prev,
        [sectionUri]: sectionArray.includes(goalText)
          ? sectionArray.filter((t) => t !== goalText)
          : [...sectionArray, goalText],
      };
    });
  };

  const handleRemoveProperty = (conceptUri: string, propertyKey: string) => {
    setSelectedProperties((prev) => {
      const currentProps = prev[conceptUri] ?? [];
      const newProps = currentProps.filter((p) => p !== propertyKey);
      return { ...prev, [conceptUri]: newProps };
    });
  };

  const handleNextStep = () => setCurrentStep((s) => Math.min(s + 1, 2));
  const handlePrevStep = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handlePrev = () => setCurrentIndex((prev) => Math.max(prev - 1, 0));
  const handleNext = () =>
    setCurrentIndex((prev) => Math.min(prev + 1, selectedConcepts.length - 1));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Typography variant="h5" fontWeight="bold">
          Generate New Question
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2, overflow: 'hidden' }}>
        <Box
          display="grid"
          gridTemplateColumns={currentStep === 0 ? '1fr' : '220px 280px 1fr'}
          gap={3}
          height="75vh"
        >
          {loading && (
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

          {currentStep === 0 && (
            <GoalSelector
              sectionGoals={sectionGoals}
              selectedGoals={selectedGoals}
              startSectionUri={startSectionUri}
              onToggleAll={handleToggleAllGoals}
              onSelectGoal={handleSelectGoal}
            />
          )}

          {currentStep > 0 && (
            <Paper
              elevation={3}
              sx={{
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                mb: 2,
              }}
            >
              <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                {selectedConcepts.length > 0 ? (
                  <Box display="flex" flexDirection="column" gap={2}>
                    {selectedConcepts.map((sc, idx) => (
                      <SelectedConcept
                        key={sc.value}
                        concept={sc}
                        index={idx}
                        currentIndex={currentIndex}
                        conceptProperties={conceptProperties}
                        selectedProperties={selectedProperties}
                        onSelect={setCurrentIndex}
                        onRemove={handleRemoveConcept}
                      />
                    ))}
                  </Box>
                ) : (
                  <Box p={3} textAlign="center">
                    <Typography color="text.secondary" variant="body2" fontStyle="italic">
                      No concepts selected
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          )}

          {currentStep === 1 && (
            <ConceptSelector
              concepts={concepts}
              selectedConcepts={selectedConcepts}
              allSelected={allSelected}
              someSelected={someSelected}
              startSectionUri={startSectionUri}
              onToggleAll={handleToggleAll}
              onSelectConcept={handleSelectConcept}
            />
          )}

          {currentStep === 2 && (
            <QuestionTypeSelector
              questionTypes={questionTypes}
              selectedQuestionTypes={selectedQuestionTypes}
              onToggleAll={handleToggleAllQuestionTypes}
              onSelectQuestionType={handleSelectQuestionType}
            />
          )}

          {currentStep === 1 && (
            <ConceptDetails
              selectedConcepts={selectedConcepts}
              currentIndex={currentIndex}
              conceptProperties={conceptProperties}
              selectedProperties={selectedProperties}
              onPrevious={handlePrev}
              onNext={handleNext}
              onSelectAllProperties={handleSelectAllProperties}
              onClearAllProperties={handleClearAllProperties}
              onToggleProperty={handleToggleProperty}
            />
          )}

          {currentStep === 2 && (
            <GenerationSummary
              selectedConcepts={selectedConcepts}
              selectedQuestionTypes={selectedQuestionTypes}
              selectedProperties={selectedProperties}
              conceptProperties={conceptProperties}
              questionTypes={questionTypes}
              sectionGoals={sectionGoals}
              selectedGoals={selectedGoals}
              onRemoveProperty={handleRemoveProperty}
              onRemoveGoal={handleRemoveGoal}
            />
          )}
        </Box>
      </DialogContent>

      <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} p={2}>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>

        <Box display="flex" gap={2}>
          {currentStep > 0 && (
            <Button variant="outlined" onClick={handlePrevStep}>
              Back
            </Button>
          )}

          {currentStep < 2 && (
            <Button
              variant="contained"
              color="primary"
              disabled={
                (currentStep === 0 && !Object.keys(selectedGoals).length) ||
                (currentStep === 1 && selectedConcepts.length === 0)
              }
              onClick={handleNextStep}
            >
              Next
            </Button>
          )}

          {currentStep === 2 && (
            <Button
              variant="contained"
              color="primary"
              disabled={selectedQuestionTypes.length === 0 || generating}
              onClick={generateNewProblems}
              startIcon={generating ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          )}
        </Box>
      </Box>
    </Dialog>
  );
};
