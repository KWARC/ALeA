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
} from '@stex-react/api';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { FlatQuizProblem } from '../../pages/quiz-gen';
import { SecInfo } from '../../types';
import { ConceptDetails } from './ConceptDetails';
import { ConceptSelector } from './ConceptSelector';
import { getSectionRange } from './CourseSectionSelector';
import { GenerationSummary } from './GenerationSummary';
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
  goal_uri: string;
  description: string;
  sub_goals: Goal[];
}

export interface SectionGoals {
  [section_uri: string]: Goal[];
}

export const mockSectionGoals: SectionGoals = {
  'https://mathhub.info?a=courses/FAU/IWGS/course&p=databases/slides&m=DDL&s=column%20specification':
    [
      {
        goal_uri: 'https://example.org/goal1',
        description: 'Understand basics of databases',
        sub_goals: [
          {
            goal_uri: 'https://example.org/goal1a',
            description: 'Learn SQL basics',
            sub_goals: [],
          },
          {
            goal_uri: 'https://example.org/goal1b',
            description: 'Understand JSON and XML formats',
            sub_goals: [
              {
                goal_uri: 'https://example.org/goal1b1',
                description: 'Parse JSON data programmatically',
                sub_goals: [],
              },
            ],
          },
        ],
      },
      {
        goal_uri: 'https://example.org/goal2',
        description: 'Learn about relational database design',
        sub_goals: [
          {
            goal_uri: 'https://example.org/goal2a',
            description: 'Understand primary keys and foreign keys',
            sub_goals: [],
          },
          {
            goal_uri: 'https://example.org/goal2b',
            description: 'Normalize database tables',
            sub_goals: [],
          },
        ],
      },
    ],
  'https://mathhub.info?a=courses/FAU/IWGS/course&p=databases/slides&m=DDL&s=create': [
    {
      goal_uri: 'https://example.org/goal3',
      description: 'Understand NoSQL databases',
      sub_goals: [
        {
          goal_uri: 'https://example.org/goal3a',
          description: 'Learn about document databases',
          sub_goals: [],
        },
        {
          goal_uri: 'https://example.org/goal3b',
          description: 'Understand key-value stores',
          sub_goals: [],
        },
      ],
    },
    {
      goal_uri: 'https://example.org/goal4',
      description: 'Explore distributed databases',
      sub_goals: [
        {
          goal_uri: 'https://example.org/goal4a',
          description: 'Understand replication strategies',
          sub_goals: [],
        },
        {
          goal_uri: 'https://example.org/goal4b',
          description: 'Learn about sharding techniques',
          sub_goals: [
            {
              goal_uri: 'https://example.org/goal4b1',
              description: 'Implement basic sharding in a test database',
              sub_goals: [],
            },
          ],
        },
      ],
    },
  ],
};

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
  const [showQuestionTypes, setShowQuestionTypes] = useState(false);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
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
  }, [startSectionUri, endSectionUri]);

  useEffect(() => {
    if (!open) return;

    const fetchGoals = async () => {
      try {
        const response: SectionGoals = mockSectionGoals;
        setSectionGoals(response);
        console.log({ response });
      } catch (err) {
        console.error('Error fetching goals:', err);
      }
    };

    fetchGoals();
  }, [open, startSectionUri, endSectionUri]);

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

  useEffect(() => {
    if (!showQuestionTypes) {
      setSelectedQuestionTypes([]);
    }
  }, [showQuestionTypes]);

  const generateNewProblems = async () => {
    setGenerating(true);

    try {
      const response = await generateQuizProblems({
        mode: 'new',
        courseId,
        startSectionUri,
        endSectionUri,
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

  const handleToggleGoal = (conceptUri: string, goalUri: string) => {
    setSelectedGoals((prev) => {
      const current = prev[conceptUri] || [];
      return {
        ...prev,
        [conceptUri]: current.includes(goalUri)
          ? current.filter((g) => g !== goalUri)
          : [...current, goalUri],
      };
    });
  };

  const handleRemoveGoal = (conceptUri: string, goalUri: string) => {
    setSelectedGoals((prev) => ({
      ...prev,
      [conceptUri]: prev[conceptUri]?.filter((g) => g !== goalUri) ?? [],
    }));
  };

  const handleSelectAllGoals = (conceptUri: string) => {
    const allGoals = sectionGoals[conceptUri]?.map((g) => g.goal_uri) || [];
    setSelectedGoals((prev) => ({ ...prev, [conceptUri]: allGoals }));
  };

  const handleClearAllGoals = (conceptUri: string) => {
    setSelectedGoals((prev) => ({ ...prev, [conceptUri]: [] }));
  };

  const handleRemoveProperty = (conceptUri: string, propertyKey: string) => {
    setSelectedProperties((prev) => {
      const currentProps = prev[conceptUri] ?? [];
      const newProps = currentProps.filter((p) => p !== propertyKey);
      return { ...prev, [conceptUri]: newProps };
    });
  };

  const handlePrev = () => setCurrentIndex((prev) => Math.max(prev - 1, 0));
  const handleNext = () =>
    setCurrentIndex((prev) => Math.min(prev + 1, selectedConcepts.length - 1));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Typography variant="h5" fontWeight="bold">
          Generate
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2, overflow: 'hidden' }}>
        <Box display="grid" gridTemplateColumns="220px 280px 1fr" gap={3} height="75vh">
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

          {!showQuestionTypes ? (
            <ConceptSelector
              concepts={concepts}
              selectedConcepts={selectedConcepts}
              allSelected={allSelected}
              someSelected={someSelected}
              startSectionUri={startSectionUri}
              onToggleAll={handleToggleAll}
              onSelectConcept={handleSelectConcept}
            />
          ) : (
            <QuestionTypeSelector
              questionTypes={questionTypes}
              selectedQuestionTypes={selectedQuestionTypes}
              onToggleAll={handleToggleAllQuestionTypes}
              onSelectQuestionType={handleSelectQuestionType}
            />
          )}
          {!showQuestionTypes ? (
            <ConceptDetails
              selectedConcepts={selectedConcepts}
              currentIndex={currentIndex}
              conceptProperties={conceptProperties}
              selectedProperties={selectedProperties}
              sectionGoals={sectionGoals}
              selectedGoals={selectedGoals}
              onPrevious={handlePrev}
              onNext={handleNext}
              onSelectAllProperties={handleSelectAllProperties}
              onClearAllProperties={handleClearAllProperties}
              onToggleProperty={handleToggleProperty}
              onSelectAllGoals={handleSelectAllGoals}
              onClearAllGoals={handleClearAllGoals}
              onToggleGoal={handleToggleGoal}
            />
          ) : (
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

      <Box display="flex" justifyContent="flex-end" gap={2} p={2}>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
        {!showQuestionTypes ? (
          <Button
            variant="contained"
            color="primary"
            disabled={selectedConcepts.length === 0}
            onClick={() => setShowQuestionTypes(true)}
          >
            Next
          </Button>
        ) : (
          <>
            <Button variant="outlined" onClick={() => setShowQuestionTypes(false)}>
              Back
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={selectedQuestionTypes.length === 0 || generating}
              onClick={generateNewProblems}
              startIcon={generating ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          </>
        )}
      </Box>
    </Dialog>
  );
};
