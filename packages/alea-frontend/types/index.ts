import { FTML } from '@flexiformal/ftml';

export interface SecInfo {
  id: string;
  title: string;
  uri: FTML.DocumentURI;
  order?: number;
  durations?: Record<string, number>;
  averagePastDuration?: number;
  latestDuration?: number;
}
