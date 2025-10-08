import { getDocIdx } from '@alea/spec';

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
    currentTerm: 'null',
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
  const allDocs = await getDocIdx();
  const currentTermByCourseId: Record<string, string> = {};
  for (const doc of allDocs) {
    if (doc.type === 'course' && doc.acronym) {
      currentTermByCourseId[doc.acronym.toLowerCase()] = getCurrentTermForUniversity(
        doc.institution ?? 'FAU'
      );
    }
  }
  return currentTermByCourseId;
}

export async function getCurrentTermForCourseId(courseId: string): Promise<string | null> {
  try {
    const allDocs = await getDocIdx();
    for (const doc of allDocs) {
      if (doc.type === 'course' && doc.acronym?.toLowerCase() === courseId.toLowerCase()) {
        const institution = doc.institution;
        if (institution) {
          return getCurrentTermForUniversity(institution);
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching course info from cached data:', error);
    return null;
  }
}
