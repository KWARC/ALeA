import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Typography
} from '@mui/material';
import {
  conceptUriToName,
  getConceptPropertyInSection,
  getDefiniedaInSection,
} from '@stex-react/api';
import React, { useEffect, useState } from 'react';
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

interface SectionDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  startSectionUri: string;
  endSectionUri: string;
  sections: SecInfo[];
  setLoading: (val: boolean) => void;
}

export const SectionDetailsDialog: React.FC<SectionDetailsDialogProps> = ({
  open,
  onClose,
  startSectionUri,
  endSectionUri,
  sections,
  setLoading,
}) => {
  const [concepts, setConcepts] = useState<{ label: string; value: string }[]>([]);
  const [selectedConcepts, setSelectedConcepts] = useState<{ label: string; value: string }[]>([]);
  const [conceptProperties, setConceptProperties] = useState<ConceptPropertiesMap>({});
  const [selectedProperties, setSelectedProperties] = useState<{ [conceptUri: string]: string[] }>(
    {}
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showQuestionTypes, setShowQuestionTypes] = useState(false);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>([]);

  const questionTypes = [
    {
      id: 'mcq',
      label: 'Multiple Choice Questions (MCQ)',
      description: 'Questions with 4 options and 1 correct answer',
    },
    {
      id: 'scq',
      label: 'Single Choice Questions (SCQ)',
      description: 'True/False or Yes/No type questions',
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
                      onRemove={(conceptValue) => {
                        setSelectedConcepts((prev) => prev.filter((c) => c.value !== conceptValue));
                      }}
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
              onSelectConcept={(concept) => {
                setSelectedConcepts((prev) => {
                  const exists = prev.some((sc) => sc.value === concept.value);
                  if (exists) {
                    const idx = prev.findIndex((sc) => sc.value === concept.value);
                    if (idx >= 0) setCurrentIndex(idx);
                    return prev;
                  } else {
                    const newConcepts = [...prev, concept];
                    setCurrentIndex(newConcepts.length - 1);
                    return newConcepts;
                  }
                });
              }}
            />
          ) : (
            <QuestionTypeSelector
              questionTypes={questionTypes}
              selectedQuestionTypes={selectedQuestionTypes}
              onToggleAll={() => {
                if (selectedQuestionTypes.length === questionTypes.length) {
                  setSelectedQuestionTypes([]);
                } else {
                  setSelectedQuestionTypes(questionTypes.map((qt) => qt.id));
                }
              }}
              onSelectQuestionType={(questionTypeId) => {
                setSelectedQuestionTypes((prev) => {
                  const exists = prev.includes(questionTypeId);
                  return exists
                    ? prev.filter((id) => id !== questionTypeId)
                    : [...prev, questionTypeId];
                });
              }}
            />
          )}
          {!showQuestionTypes ? (
            <ConceptDetails
              selectedConcepts={selectedConcepts}
              currentIndex={currentIndex}
              conceptProperties={conceptProperties}
              selectedProperties={selectedProperties}
              onPrevious={handlePrev}
              onNext={handleNext}
              onSelectAllProperties={(conceptUri) => {
                const allProps = (conceptProperties[conceptUri] ?? []).map((p) => p.prop);
                setSelectedProperties((prev) => ({ ...prev, [conceptUri]: allProps }));
              }}
              onClearAllProperties={(conceptUri) => {
                setSelectedProperties((prev) => ({ ...prev, [conceptUri]: [] }));
              }}
              onToggleProperty={(conceptUri, propertyKey) => {
                setSelectedProperties((prev) => {
                  const currentProps = prev[conceptUri] ?? [];
                  const isSelected = currentProps.includes(propertyKey);
                  const newProps = isSelected
                    ? currentProps.filter((p) => p !== propertyKey)
                    : [...currentProps, propertyKey];
                  return { ...prev, [conceptUri]: newProps };
                });
              }}
            />
          ) : (
            <GenerationSummary
              selectedConcepts={selectedConcepts}
              selectedQuestionTypes={selectedQuestionTypes}
              selectedProperties={selectedProperties}
              questionTypes={questionTypes}
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
              disabled={selectedQuestionTypes.length === 0}
              onClick={() => {
                console.log('Generate questions:', {
                  selectedConcepts,
                  selectedQuestionTypes,
                  selectedProperties,
                });
              }}
            >
              Generate
            </Button>
          </>
        )}
      </Box>
    </Dialog>
  );
};
