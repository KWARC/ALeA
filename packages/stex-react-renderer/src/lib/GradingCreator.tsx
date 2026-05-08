import {
  Box,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Tooltip,
} from '@mui/material';
import { AnswerClass, CreateAnswerClassRequest, GradingInfo } from '@alea/spec';
import {
  DEFAULT_ANSWER_CLASSES,
  omitAnswerClassesDuplicatingDefaultRadioTitles,
} from '@alea/quiz-utils';
import { useRouter } from 'next/router';
import { ChangeEvent, SyntheticEvent, useEffect, useMemo, useState } from 'react';
import { getLocaleObject } from './lang/utils';
import { SafeFTMLFragment } from './SafeFTMLComponents';

type ClassRow = AnswerClass & { count: number };

function applySavedToRows(base: ClassRow[], saved: GradingInfo | null): ClassRow[] {
  if (!saved?.answerClasses?.length) return base;
  const byId = new Map(saved.answerClasses.map((a) => [a.answerClassId, a.count]));
  return base.map((c) => ({ ...c, count: byId.get(c.className) ?? 0 }));
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
  onNewGrading,
  initialGrading = null,
}: {
  rawAnswerClasses: AnswerClass[];
  showPoints?: boolean;
  onNewGrading?: (acs: CreateAnswerClassRequest[], feedback: string) => Promise<void>;
  /** When set, counts / feedback are restored (e.g. peer grader reopens an already graded item). */
  initialGrading?: GradingInfo | null;
}) {
  const router = useRouter();
  const t = getLocaleObject(router).quiz;
  const mergedBase = useMemo(
    () =>
      [
        ...DEFAULT_ANSWER_CLASSES,
        ...omitAnswerClassesDuplicatingDefaultRadioTitles(rawAnswerClasses),
      ].map((c): ClassRow => ({ ...c, count: 0 })),
    [rawAnswerClasses]
  );
  const hydrated = useMemo(
    () => applySavedToRows(mergedBase, initialGrading),
    [mergedBase, initialGrading]
  );
  const [answerClasses, setAnswerClasses] = useState<ClassRow[]>(hydrated);
  const [feedback, setFeedBack] = useState(initialGrading?.customFeedback ?? '');
  const [selectedAnswerClass, setSelectAnswerClass] = useState<AnswerClass | undefined>(undefined);
  const isAnswerClassSelected = !!selectedAnswerClass;

  function feedbackText(selected: AnswerClass | undefined, rows: ClassRow[]) {
    return [selected, ...rows.filter((c) => c.isTrait && c.count > 0)]
      .map((c) => c?.description?.trim())
      .filter(Boolean)
      .join('\n\n');
  }

  useEffect(() => {
    setAnswerClasses(hydrated);
    setFeedBack(initialGrading?.customFeedback ?? '');
    setSelectAnswerClass(hydrated.find((c) => !c.isTrait && c.count > 0) ?? undefined);
  }, [hydrated, initialGrading]);
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
    setFeedBack(feedbackText(selected, newAnswerClasses));
    setAnswerClasses(newAnswerClasses);
  };
  async function onSaveGrading(event: SyntheticEvent) {
    event.preventDefault();
    if (!onNewGrading) return;

    const acs: CreateAnswerClassRequest[] = answerClasses
      .map((c) => ({
        answerClassId: c.className,
        closed: c.closed,
        description: c.description ?? '',
        title: c.title ?? '',
        isTrait: c.isTrait,
        points: c.points,
        count: c.count,
      }))
      .filter((c) => c.count > 0);
    await onNewGrading(acs, feedback);
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
      {!selectedAnswerClass?.closed &&
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

      <Button type="submit" variant="contained" disabled={!isAnswerClassSelected}>
        {t.submit}
      </Button>
    </form>
  );
}
