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

export async function getCurrentTermByCourseId(): Promise<Record<string, string>> {
  const currentTermByCourseId: Record<string, string> = {};
  for (const [courseId, info] of Object.entries(COURSES_INFO)) {
    const key = courseId.toLowerCase();
    const institution = info.institution ?? 'FAU';
    currentTermByCourseId[key] = getCurrentTermForUniversity(institution);
  }
  return currentTermByCourseId;
}

export async function getCurrentTermForCourseId(courseId: string): Promise<string | null> {
  const key = courseId.toLowerCase();
  const info = COURSES_INFO[key];
  if (!info) return null;
  const institution = info.institution;
  if (!institution) return null;
  return getCurrentTermForUniversity(institution);
}
