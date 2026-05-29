import {
  Box,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { AnswerClass, CreateAnswerClassRequest, GradingInfo } from '@alea/spec';
import { DEFAULT_ANSWER_CLASSES } from '@alea/quiz-utils';
import { useRouter } from 'next/router';
import { ChangeEvent, SyntheticEvent, useEffect, useMemo, useRef, useState } from 'react';
import { getLocaleObject } from './lang/utils';
import { SafeFTMLFragment } from './SafeFTMLComponents';

type ClassRow = AnswerClass & { count: number };

function scaleAnswerClassPoints(c: AnswerClass, maxPoints?: number): AnswerClass {
  if (!maxPoints || c.points <= maxPoints || c.points < 100) return c;
  return { ...c, points: (c.points / 1000) * maxPoints };
}

function applySavedToRows(base: ClassRow[], saved: GradingInfo | null): ClassRow[] {
  if (!saved?.answerClasses?.length) return base;
  const byId = new Map(saved.answerClasses.map((a) => [a.answerClassId, a.count]));
  return base.map((c) => ({ ...c, count: byId.get(c.className) ?? 0 }));
}

function preserveCounts(base: ClassRow[], current: ClassRow[]): ClassRow[] {
  const byId = new Map(current.map((c) => [c.className, c.count]));
  return base.map((c) => ({ ...c, count: byId.get(c.className) ?? c.count }));
}

function AnswerClassTitleLabel({ title }: { title: string }) {
  return (
    <Box
      component="span"
      sx={{ display: 'inline-block', maxWidth: '100%', verticalAlign: 'text-bottom' }}
    >
      <SafeFTMLFragment
        fragment={{ type: 'HtmlString', html: title.trim() || ' ', uri: undefined }}
      />
    </Box>
  );
}
export function GradingCreator({
  rawAnswerClasses = [],
  showPoints = false,
  showSubmit = true,
  onNewGrading,
  onGradingChange,
  initialGrading = null,
  maxPoints,
}: {
  rawAnswerClasses: AnswerClass[];
  showPoints?: boolean;
  showSubmit?: boolean;
  onNewGrading?: (acs: CreateAnswerClassRequest[], feedback: string) => Promise<void>;
  onGradingChange?: (
    acs: CreateAnswerClassRequest[],
    feedback: string,
    hasSelectedAnswerClass: boolean
  ) => void;
  /** When set, counts / feedback are restored (e.g. peer grader reopens an already graded item). */
  initialGrading?: GradingInfo | null;
  maxPoints?: number;
}) {
  const router = useRouter();
  const t = getLocaleObject(router).quiz;
  const mergedBase = useMemo(
    () =>
      [...DEFAULT_ANSWER_CLASSES, ...rawAnswerClasses]
        .map((c) => scaleAnswerClassPoints(c, maxPoints))
        .map((c): ClassRow => ({ ...c, count: 0 })),
    [maxPoints, rawAnswerClasses]
  );
  const hydrated = useMemo(
    () => applySavedToRows(mergedBase, initialGrading),
    [mergedBase, initialGrading]
  );
  const initialSelectedAnswerClass = useMemo(
    () => hydrated.find((c) => !c.isTrait && c.count > 0) ?? undefined,
    [hydrated]
  );
  const rawAnswerClassIds = useMemo(
    () => new Set(rawAnswerClasses.filter((c) => !c.isTrait).map((c) => c.className)),
    [rawAnswerClasses]
  );
  const [answerClasses, setAnswerClasses] = useState<ClassRow[]>(hydrated);
  const [feedback, setFeedBack] = useState(initialGrading?.customFeedback ?? '');
  const [selectedAnswerClass, setSelectAnswerClass] = useState<AnswerClass | undefined>(
    initialSelectedAnswerClass
  );
  const selectedClassNameRef = useRef<string | undefined>(initialSelectedAnswerClass?.className);
  const isAnswerClassSelected = !!selectedAnswerClass;
  const showTraitInputs =
    isAnswerClassSelected &&
    (!selectedAnswerClass.closed || rawAnswerClassIds.has(selectedAnswerClass.className));
  const totalPoints = useMemo(
    () => answerClasses.reduce((sum, c) => sum + c.count * c.points, 0),
    [answerClasses]
  );
  const selectedAnswerClasses = useMemo(
    () =>
      answerClasses
        .map((c) => ({
          answerClassId: c.className,
          closed: c.closed,
          description: c.description ?? '',
          title: c.title ?? '',
          isTrait: c.isTrait,
          points: c.points,
          count: c.count,
        }))
        .filter((c) => c.count > 0),
    [answerClasses]
  );

  function feedbackText(selected: AnswerClass | undefined, rows: ClassRow[]) {
    return [selected, ...rows.filter((c) => c.isTrait && c.count > 0)]
      .map((c) => c?.description?.trim())
      .filter(Boolean)
      .join('\n\n');
  }

  useEffect(() => {
    const selectedClassName = selectedClassNameRef.current;
    if (selectedClassName) {
      setAnswerClasses((current) => preserveCounts(hydrated, current));
      setSelectAnswerClass(
        (current) => hydrated.find((c) => c.className === selectedClassName) ?? current
      );
      return;
    }

    setAnswerClasses(hydrated);
    setFeedBack(initialGrading?.customFeedback ?? '');
    setSelectAnswerClass(initialSelectedAnswerClass);
    selectedClassNameRef.current = initialSelectedAnswerClass?.className;
  }, [hydrated, initialGrading, initialSelectedAnswerClass]);

  useEffect(() => {
    onGradingChange?.(selectedAnswerClasses, feedback, isAnswerClassSelected);
  }, [feedback, isAnswerClassSelected, onGradingChange, selectedAnswerClasses]);

  const handleAnswerClassesChange = (
    id: string,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newAnswerClasses = answerClasses.map((answerclass) => {
      if (answerclass.className === id) {
        const newCount = +event.target.value;
        return { ...answerclass, count: newCount >= 0 ? newCount : 0 };
      }
      return answerclass;
    });

    setFeedBack(feedbackText(selectedAnswerClass, newAnswerClasses));
    setAnswerClasses(newAnswerClasses);
  };
  const handleDefaultAnswerClassesChange = (id: string) => {
    const selected = answerClasses.find((answerclass) => answerclass.className === id);
    const newAnswerClasses = answerClasses.map((answerclass) => {
      if (answerclass.className === id) {
        return { ...answerclass, count: 1 };
      }
      return { ...answerclass, count: 0 };
    });

    setSelectAnswerClass(selected);
    selectedClassNameRef.current = selected?.className;
    setFeedBack(feedbackText(selected, newAnswerClasses));
    setAnswerClasses(newAnswerClasses);
  };
  async function onSaveGrading(event: SyntheticEvent) {
    event.preventDefault();
    if (!onNewGrading) return;

    await onNewGrading(selectedAnswerClasses, feedback);
    setFeedBack('');
  }
  return (
    <form onSubmit={onSaveGrading}>
      <RadioGroup
        value={selectedAnswerClass?.className ?? ''}
        onChange={(_, v) => {
          handleDefaultAnswerClassesChange(String(v));
        }}
      >
        {answerClasses
          .filter((c) => !c.isTrait)
          .map((d) => (
            <Tooltip key={d.className} title={d.description} placement="top-start">
              <FormControlLabel
                value={d.className}
                control={<Radio />}
                label={<AnswerClassTitleLabel title={d.title} />}
              />
            </Tooltip>
          ))}
      </RadioGroup>
      {showTraitInputs &&
        answerClasses
          .filter((c) => c.isTrait)
          .map((d) => (
            <Box key={d.className}>
              <TextField
                size="small"
                onChange={(e) => handleAnswerClassesChange(d.className, e)}
                style={{ marginLeft: '10px', width: '70px' }}
                type="number"
                value={d.count}
              />
              <Tooltip title={d.description} placement="top-start">
                <span>
                  <AnswerClassTitleLabel title={d.title} />
                  {showPoints && ` (${t.point}:${d.points})`}
                </span>
              </Tooltip>
            </Box>
          ))}
      {isAnswerClassSelected ? (
        <>
          <Typography variant="subtitle2" sx={{ my: 1 }}>
            Total points: {totalPoints}
          </Typography>
          <span>{t.feedback}</span>
          <TextField
            multiline
            fullWidth
            placeholder={t.feedback}
            minRows={5}
            value={feedback}
            style={{ display: 'block' }}
            onChange={(e) => setFeedBack(e.target.value)}
          />
        </>
      ) : null}

      {showSubmit ? (
        <Button type="submit" variant="contained" disabled={!isAnswerClassSelected}>
          {t.submit}
        </Button>
      ) : null}
    </form>
  );
}
