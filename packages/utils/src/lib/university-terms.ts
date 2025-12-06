import { COURSES_INFO } from './courseInfo';

export interface UniversityTermConfig {
  universityId: string;
  currentTerm: string;
}

export const UNIVERSITY_TERMS: Record<string, UniversityTermConfig> = {
  FAU: {
    universityId: 'FAU',
    currentTerm: 'WS25-26',
  },
  IISc: {
    universityId: 'IISc',
    currentTerm: 'null',
  },
  Jacobs: {
    universityId: 'Jacobs',
    currentTerm: 'WS25-26',
  },
  'Heriot Watt': {
    universityId: 'Heriot Watt',
    currentTerm: 'null',
  },
  Bath:{
    universityId: 'Bath',
    currentTerm: 'null',
  },
  others: {
    universityId: 'others',
    currentTerm: 'null',
  },
};

export function getCurrentTermForUniversity(universityId: string): string {
  const config = UNIVERSITY_TERMS[universityId];
  return config.currentTerm;
}

