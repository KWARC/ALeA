import { getDocIdx } from '@alea/spec';

export interface UniversityTermConfig {
  universityId: string;
  currentTerm: string;
}

export const UNIVERSITY_TERMS: Record<string, UniversityTermConfig> = {
  FAU: {
    universityId: 'FAU',
    currentTerm: 'SS25',
  },
  IISc: {
    universityId: 'IISc',
    currentTerm: 'SS25',
  },
  Jacobs: {
    universityId: 'Jacobs',
    currentTerm: 'SS25',
  },
  'Heriot Watt': {
    universityId: 'Heriot Watt',
    currentTerm: 'SS25',
  },
  others: {
    universityId: 'others',
    currentTerm: 'SS25',
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
