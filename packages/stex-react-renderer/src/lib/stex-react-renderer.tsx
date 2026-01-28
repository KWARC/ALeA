import { FTML } from '@flexiformal/ftml';
import { Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { tooltipClasses, TooltipProps } from '@mui/material/Tooltip';
import axios from 'axios';
import { createContext, ReactNode, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CompetencyTable from './CompetencyTable';
import { ContentDashboard } from './ContentDashboard';
import { DocProblemBrowser } from './DocProblemBrowser';
import { ExpandableContextMenu } from './ExpandableContextMenu';
import { GradingCreator } from './GradingCreator';
import { FixedPositionMenu, LayoutWithFixedMenu } from './LayoutWithFixedMenu';
import { handleViewSource, PerSectionQuiz, UriProblemViewer } from './PerSectionQuiz';
import { PracticeQuestions } from './PracticeQuestions';
import { AnswerContext, ProblemDisplay } from './ProblemDisplay';
import { ListStepper, QuizDisplay } from './QuizDisplay';
import SectionReview from './SectionReview';
import {
  ConfigureLevelSlider,
  DimIcon,
  LevelIcon,
  SelfAssessment2,
  SelfAssessmentDialog,
} from './SelfAssessmentDialog';
import { GradingContext, GradingDisplay, ShowGradingFor } from './SubProblemAnswer';
import { TourAPIEntry, TourDisplay } from './TourDisplay';
import TrafficLightIndicator from './TrafficLightIndicator';
import { DimAndURIListDisplay, URIListDisplay } from './UriListDisplay';
import { ExamSelect } from './ExamSelect';

import { computePointsFromFeedbackJson, FTMLProblemWithSolution } from '@alea/spec';

export const ServerLinksContext = createContext({ gptUrl: '' });
export const FTMLReadyContext = createContext<boolean>(false);

export function getPoints(problem: FTMLProblemWithSolution, response?: FTML.ProblemResponse) {
  if (!response) return 0;
  if (!problem?.solution) return NaN;
  const s = FTML.Solutions.from_jstring(problem.solution);
  const feedbackJson = s?.check_response(response);
  return computePointsFromFeedbackJson(problem.problem, feedbackJson);
}

const NoMaxWidthTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))({
  [`& .${tooltipClasses.tooltip}`]: {
    maxWidth: 'none',
    margin: '0',
    padding: '0',
    backgroundColor: 'white',
  },
});

interface PositionData {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
  conceptName: string;
  conceptRenderedName: string;
  uri: string;
}

const PositionContext = createContext<{
  addPosition: (position: PositionData) => void;
  isRecording: boolean;
  setIsRecording: (state: boolean) => void;
}>(null as any);

const getDeviceId = () => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = uuidv4().substring(0, 8);
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

const getRecordingId = () => {
  let recordingId = sessionStorage.getItem('recordingId');
  if (!recordingId) {
    recordingId = new Date().toISOString();
    sessionStorage.setItem('recordingId', recordingId);
  }
  return recordingId;
};

const PositionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const addPosition = (position: PositionData) => {
    setPositions((prev) => {
      const isDuplicate = prev.some(
        (p) =>
          p.top === position.top &&
          p.left === position.left &&
          p.width === position.width &&
          p.height === position.height &&
          p.conceptName === position.conceptName &&
          p.uri === position.uri
      );

      if (!isDuplicate) {
        return [...prev, position];
      }
      return prev;
    });
  };

  useEffect(() => {
    if (positions.length === 0 || !isRecording) return;

    const timer = setTimeout(() => {
      const browserCurrentTime = new Date().toISOString();
      const pageUrl = window.location.href;
      const deviceId = getDeviceId();
      const recordingId = getRecordingId();
      const payload = {
        deviceId,
        recordingId,
        browserCurrentTime,
        pageUrl,
        positions,
      };

      axios
        .post('/api/set-concept-positions', payload)
        .then(() => console.log('Data sent successfully'))
        .catch((error) => console.error('Error sending data', error));

      setPositions([]);
    }, 1000);

    return () => clearTimeout(timer);
  }, [positions, isRecording]);

  return (
    <PositionContext.Provider value={{ addPosition, isRecording, setIsRecording }}>
      {children}
    </PositionContext.Provider>
  );
};

export {
  AnswerContext,
  CompetencyTable,
  ConfigureLevelSlider,
  ContentDashboard,
  DimAndURIListDisplay,
  DimIcon,
  DocProblemBrowser,
  ExamSelect,
  ExpandableContextMenu,
  FixedPositionMenu,
  GradingContext,
  GradingCreator,
  GradingDisplay,
  handleViewSource,
  LayoutWithFixedMenu,
  LevelIcon,
  ListStepper,
  NoMaxWidthTooltip,
  PerSectionQuiz,
  PositionContext,
  PositionProvider,
  PracticeQuestions,
  ProblemDisplay,
  QuizDisplay,
  SectionReview,
  SelfAssessment2,
  SelfAssessmentDialog,
  ShowGradingFor,
  TourDisplay,
  TrafficLightIndicator,
  URIListDisplay,
  UriProblemViewer,
};
export type { TourAPIEntry };
