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

const CORRECT_BUT_CLASS_ID = 'ac-default-06';
const WRONG_BUT_CLASS_ID = 'ac-default-07';

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

function isAnswerClassApplicableToSelectedDefault(
  answerClass: AnswerClass,
  selectedDefaultAnswerClass?: AnswerClass
): boolean {
  if (!answerClass.isTrait) return true;
  if (selectedDefaultAnswerClass?.className === CORRECT_BUT_CLASS_ID) {
    return answerClass.points < 0;
  }
  if (selectedDefaultAnswerClass?.className === WRONG_BUT_CLASS_ID) {
    return answerClass.points > 0;
  }
  return true;
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
  const [feedback, setFeedback] = useState(initialGrading?.customFeedback ?? '');
  const [selectedAnswerClass, setSelectAnswerClass] = useState<AnswerClass | undefined>(
    initialSelectedAnswerClass
  );
  const selectedClassNameRef = useRef<string | undefined>(initialSelectedAnswerClass?.className);
  const isAnswerClassSelected = !!selectedAnswerClass;
  const showTraitInputs =
    isAnswerClassSelected &&
    (!selectedAnswerClass.closed || rawAnswerClassIds.has(selectedAnswerClass.className));
  const hasPositiveTraitAnswerClasses = useMemo(
    () => answerClasses.some((answerClass) => answerClass.isTrait && answerClass.points > 0),
    [answerClasses]
  );
  const hasNegativeTraitAnswerClasses = useMemo(
    () => answerClasses.some((answerClass) => answerClass.isTrait && answerClass.points < 0),
    [answerClasses]
  );
  const visibleDefaultAnswerClasses = useMemo(
    () =>
      answerClasses.filter(
        (answerClass) =>
          !answerClass.isTrait &&
          (answerClass.className !== WRONG_BUT_CLASS_ID || hasPositiveTraitAnswerClasses) &&
          (answerClass.className !== CORRECT_BUT_CLASS_ID || hasNegativeTraitAnswerClasses)
      ),
    [answerClasses, hasNegativeTraitAnswerClasses, hasPositiveTraitAnswerClasses]
  );
  const applicableAnswerClasses = useMemo(
    () =>
      answerClasses.filter((answerClass) =>
        isAnswerClassApplicableToSelectedDefault(answerClass, selectedAnswerClass)
      ),
    [answerClasses, selectedAnswerClass]
  );
  const visibleTraitAnswerClasses = useMemo(
    () => applicableAnswerClasses.filter((answerClass) => answerClass.isTrait),
    [applicableAnswerClasses]
  );
  const totalPoints = useMemo(
    () =>
      applicableAnswerClasses.reduce(
        (sum, answerClass) => sum + answerClass.count * answerClass.points,
        0
      ),
    [applicableAnswerClasses]
  );
  const selectedAnswerClasses = useMemo(
    () =>
      applicableAnswerClasses
        .map((answerClass) => ({
          answerClassId: answerClass.className,
          closed: answerClass.closed,
          description: answerClass.description ?? '',
          title: answerClass.title ?? '',
          isTrait: answerClass.isTrait,
          points: answerClass.points,
          count: answerClass.count,
        }))
        .filter((answerClass) => answerClass.count > 0),
    [applicableAnswerClasses]
  );

  function buildFeedbackText(selected: AnswerClass | undefined, rows: ClassRow[]) {
    return [
      selected,
      ...rows.filter(
        (answerClass) =>
          answerClass.isTrait &&
          answerClass.count > 0 &&
          isAnswerClassApplicableToSelectedDefault(answerClass, selected)
      ),
    ]
      .map((answerClass) => answerClass?.description?.trim())
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
    setFeedback(initialGrading?.customFeedback ?? '');
    setSelectAnswerClass(initialSelectedAnswerClass);
    selectedClassNameRef.current = initialSelectedAnswerClass?.className;
  }, [hydrated, initialGrading, initialSelectedAnswerClass]);

  useEffect(() => {
    onGradingChange?.(selectedAnswerClasses, feedback, isAnswerClassSelected);
  }, [feedback, isAnswerClassSelected, onGradingChange, selectedAnswerClasses]);

  const handleAnswerClassesChange = (
    className: string,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newAnswerClasses = answerClasses.map((answerClass) => {
      if (answerClass.className === className) {
        const newCount = +event.target.value;
        return { ...answerClass, count: newCount >= 0 ? newCount : 0 };
      }
      return answerClass;
    });

    setFeedback(buildFeedbackText(selectedAnswerClass, newAnswerClasses));
    setAnswerClasses(newAnswerClasses);
  };
  const handleDefaultAnswerClassesChange = (className: string) => {
    const selectedDefaultAnswerClass = answerClasses.find(
      (answerClass) => answerClass.className === className
    );
    const newAnswerClasses = answerClasses.map((answerClass) => {
      if (answerClass.className === className) {
        return { ...answerClass, count: 1 };
      }
      return { ...answerClass, count: 0 };
    });

    setSelectAnswerClass(selectedDefaultAnswerClass);
    selectedClassNameRef.current = selectedDefaultAnswerClass?.className;
    setFeedback(buildFeedbackText(selectedDefaultAnswerClass, newAnswerClasses));
    setAnswerClasses(newAnswerClasses);
  };
  async function onSaveGrading(event: SyntheticEvent) {
    event.preventDefault();
    if (!onNewGrading) return;

    await onNewGrading(selectedAnswerClasses, feedback);
    setFeedback('');
  }
  return (
    <form onSubmit={onSaveGrading}>
      <RadioGroup
        value={selectedAnswerClass?.className ?? ''}
        onChange={(_, v) => {
          handleDefaultAnswerClassesChange(String(v));
        }}
      >
        {visibleDefaultAnswerClasses.map((answerClass) => (
          <Tooltip
            key={answerClass.className}
            title={answerClass.description}
            placement="top-start"
          >
            <FormControlLabel
              value={answerClass.className}
              control={<Radio />}
              label={<AnswerClassTitleLabel title={answerClass.title} />}
            />
          </Tooltip>
        ))}
      </RadioGroup>
      {showTraitInputs &&
        visibleTraitAnswerClasses.map((answerClass) => (
          <Box key={answerClass.className}>
            <TextField
              size="small"
              onChange={(event) => handleAnswerClassesChange(answerClass.className, event)}
              style={{ marginLeft: '10px', width: '70px' }}
              type="number"
              value={answerClass.count}
            />
            <Tooltip title={answerClass.description} placement="top-start">
              <span>
                <AnswerClassTitleLabel title={answerClass.title} />
                {showPoints && ` (${t.point}:${answerClass.points})`}
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
            onChange={(e) => setFeedback(e.target.value)}
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
