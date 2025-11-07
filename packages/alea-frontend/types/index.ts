import { FTML } from '@flexiformal/ftml';

export interface SecInfo {
  id: string;
  title: string;
  uri: FTML.DocumentUri;
  duration?: number;
}
