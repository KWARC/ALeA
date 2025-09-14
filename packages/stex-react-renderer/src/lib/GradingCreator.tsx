import {
  Box,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Tooltip,
} from '@mui/material';
import { AnswerClass, CreateAnswerClassRequest } from '@alea/spec';
import { DEFAULT_ANSWER_CLASSES } from '@alea/quiz-utils';
import { useRouter } from 'next/router';
import { ChangeEvent, SyntheticEvent, useEffect, useState } from 'react';
import { getLocaleObject } from './lang/utils';
export function GradingCreator({
  rawAnswerClasses = [],
  showPoints = false,
  onNewGrading,
}: {
  rawAnswerClasses: AnswerClass[];
  showPoints?: boolean;
  onNewGrading?: (acs: CreateAnswerClassRequest[], feedback: string) => Promise<void>;
}) {
  const router = useRouter();
  const t = getLocaleObject(router).quiz;
  const [answerClasses, setAnswerClasses] = useState(
    [...DEFAULT_ANSWER_CLASSES, ...rawAnswerClasses].map((c) => ({
      count: 0,
      ...c,
    }))
  );

  const [feedback, setFeedBack] = useState('');
  const [selectedAnswerClass, setSelectAnswerClass] = useState<AnswerClass | undefined>(undefined);
  const isAnswerClassSelected = !!selectedAnswerClass;

  useEffect(() => {
    setAnswerClasses(
      [...DEFAULT_ANSWER_CLASSES, ...rawAnswerClasses].map((c) => ({
        count: 0,
        ...c,
      }))
    );
  }, [rawAnswerClasses]);
  const handleAnswerClassesChange = (
    id: string,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newAnswerClasses = answerClasses.map((answerclass) => {
      //TODO:Check
      if (answerclass.className === id) {
        const newCount = +event.target.value;
        return { ...answerclass, count: newCount >= 0 ? newCount : 0 };
      }
      return answerclass;
    });

    setAnswerClasses(newAnswerClasses);
  };
  const handleDefaultAnswerClassesChange = (id: string) => {
    const newAnswerClasses = answerClasses.map((answerclass) => {
      if (answerclass.className === id) {
        setSelectAnswerClass(answerclass);
        return { ...answerclass, count: 1 };
      }
      return { ...answerclass, count: 0 };
    });

    setAnswerClasses(newAnswerClasses);
  };
  async function onSaveGrading(event: SyntheticEvent) {
    event.preventDefault();
    const acs: CreateAnswerClassRequest[] = answerClasses
      .map((c) => ({
        answerClassId: c.className,
        closed: c.closed,
        description: c.description,
        title: c.title,
        isTrait: c.isTrait,
        points: c.points,
        count: c.count,
      }))
      .filter((c) => c.count > 0);
    onNewGrading?.(acs, feedback);
    setFeedBack('');
    setSelectAnswerClass(answerClasses[0]);
  }
  return (
    <form onSubmit={onSaveGrading}>
      <RadioGroup>
        {answerClasses
          .filter((c) => !c.isTrait)
          .map((d) => (
            <Tooltip title={d.description} placement="top-start">
              <FormControlLabel
                onChange={(e) => handleDefaultAnswerClassesChange(d.className)}
                value={d.className}
                control={<Radio />}
                label={d.title}
              />
            </Tooltip>
          ))}
      </RadioGroup>
      {!selectedAnswerClass?.closed &&
        answerClasses
          .filter((c) => c.isTrait)
          .map((d) => (
            <Box>
              <TextField
                size="small"
                onChange={(e) => handleAnswerClassesChange(d.className, e)}
                style={{ marginLeft: '10px', width: '70px' }}
                type="number"
                defaultValue="0"
              ></TextField>
              <Tooltip title={d.description} placement="top-start">
                <span>
                  {d.title}
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
