import { FTML } from '@kwarc/ftml-viewer';

export interface SecInfo {
  id: string;
  title: string;
  uri: FTML.DocumentURI;
  order?: number;
  durations?: Record<string, number>;
  averagePastDuration?: number;
  latestDuration?: number;
}
