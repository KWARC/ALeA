import { ClipInfo } from "@alea/spec";

export type SlidesClipInfo = {
  [sectionId: string]: {
    [slideUri: string]: ClipInfo[];
  };
};
