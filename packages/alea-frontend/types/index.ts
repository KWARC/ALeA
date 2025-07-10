import { FTML } from '@kwarc/ftml-viewer';

export interface SecInfo {
  id: string;
  title: string;
  uri: FTML.DocumentURI;
  duration?: number;
}
