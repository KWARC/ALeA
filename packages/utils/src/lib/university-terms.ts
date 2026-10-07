export interface UniversityTermConfig {
  universityId: string;
  currentTerm: string;
  upcomingTerm?: string;
}

export const UNIVERSITY_TERMS: Record<string, UniversityTermConfig> = {
  FAU: {
    universityId: 'FAU',
    currentTerm: 'WS26-27',
    upcomingTerm: 'SS27',
  },
  IISc: {
    universityId: 'IISc',
    currentTerm: 'null',
  },
  Jacobs: {
    universityId: 'Jacobs',
    currentTerm: 'WS26-27',
    upcomingTerm: 'SS27',
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
  return config?.currentTerm;
}

export function getUpcomingTermForUniversity(universityId: string): string | undefined {
  const config = UNIVERSITY_TERMS[universityId];
  return config?.upcomingTerm;
}
