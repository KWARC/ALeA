import { getParamFromUri } from '@alea/utils';

export function getExamMeta(
  examUri?: string,
  exam?: { term?: string; number?: string; date?: string },
  courseId?: string
) {
  if (!examUri) return null;

  const decodedUri = decodeURIComponent(examUri);
  let courseAcronym = '';

  // 1. Agar courseId explicitly passed hai (AI-1 ya AI-2)
  if (courseId) {
    // Normalize: if it's just "ai", label it "AI-1", otherwise use the ID (like AI-2)
    const normalized = courseId.toLowerCase();
    courseAcronym = normalized === 'ai' ? 'AI-1' : normalized.toUpperCase();
  }

  // 2. Fallback: Agar courseId nahi hai ya blank hai, toh URL se nikalo
  if (!courseAcronym) {
    const match = decodedUri.match(/courses\/[^/]+\/([^/]+)/);
    if (match && match[1]) {
      const raw = match[1].toLowerCase();
      // Handle the "ai" -> "AI-1" legacy mapping, but keep "ai-2" as "AI-2"
      courseAcronym = raw === 'ai' ? 'AI-1' : raw.toUpperCase();
    } else {
      courseAcronym = 'AI-1'; // Absolute fallback
    }
  }
  const dParam = getParamFromUri(decodedUri, 'd') || '';
  const cleanedD = dParam.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const pParam = getParamFromUri(decodedUri, 'p') || '';
  const rawTerm = exam?.term || pParam.split('/')[0] || '';
  const formattedTerm = rawTerm.replace(/([A-Z]+)(\d{2})(\d{2})/, '$1 $2/$3');

  let formattedDate = '';
  if (exam?.date) {
    formattedDate = new Date(exam.date).toLocaleDateString('en-GB');
  } else {
    const dateMatch = decodedUri.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      formattedDate = new Date(dateMatch[1]).toLocaleDateString('en-GB');
    }
  }

  return {
    courseAcronym,
    cleanedD,
    formattedTerm,
    formattedDate,
  };
}

export function formatExamLabelDropdown(examUri?: string, exam?: any, courseId?: string) {
  const meta = getExamMeta(examUri, exam, courseId);
  if (!meta) return '';

  const { cleanedD, formattedTerm } = meta;
  return [cleanedD, formattedTerm].filter(Boolean).join(' ');
}

export function formatExamLabelFull(examUri?: string, exam?: any, courseId?: string) {
  const meta = getExamMeta(examUri, exam, courseId);
  if (!meta) return '';

  const { courseAcronym, cleanedD, formattedTerm, formattedDate } = meta;

  return [courseAcronym, cleanedD, formattedTerm, formattedDate ? `from ${formattedDate}` : '']
    .filter(Boolean)
    .join(' ');
}
