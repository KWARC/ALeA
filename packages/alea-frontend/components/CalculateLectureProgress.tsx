import { FTML } from '@kwarc/ftml-viewer';
import { LectureEntry } from '@alea/utils'; 
import { SecInfo } from '../types';
import dayjs from 'dayjs';

export function calculateLectureProgress(
  entries: LectureEntry[],
  secInfo: Record<FTML.DocumentURI, SecInfo>
) {
  let totalLatestMinutes = 0;
  let count = 0;
  let lastFilledSectionUri: string | null = null;

  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].sectionUri) {
      lastFilledSectionUri = entries[i].sectionUri;
      break;
    }
  }

  for (const entry of entries) {
    if (!entry.sectionUri) continue;

    const section = secInfo[entry.sectionUri];
    if (!section || section.latestDuration == null || section.averagePastDuration == null) continue;

    const latestMins = Math.ceil(section.latestDuration / 60);
    totalLatestMinutes += latestMins;
    count++;

    if (entry.sectionUri === lastFilledSectionUri) break;
  }

  if (lastFilledSectionUri && count > 0) {
    const lastEntry = entries.find((e) => e.sectionUri === lastFilledSectionUri);
    const targetUri = lastEntry?.targetSectionUri;
    if (!targetUri) return 'Progress unknown';

    const allSectionsOrdered = Object.values(secInfo).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );

    const fromIdx = allSectionsOrdered.findIndex((s) => s.uri === lastFilledSectionUri);
    const toIdx = allSectionsOrdered.findIndex((s) => s.uri === targetUri);
    if (fromIdx === -1 || toIdx === -1) return 'Progress unknown';

    const isBefore = fromIdx < toIdx;
    const [start, end] = isBefore ? [fromIdx, toIdx] : [toIdx, fromIdx];
    const inBetweenSections = allSectionsOrdered.slice(start + 1, end + 1);

    const totalAvgInBetween = inBetweenSections.reduce((sum, sec) => {
      return sum + (sec.averagePastDuration != null ? Math.ceil(sec.averagePastDuration / 60) : 0);
    }, 0);

    const adjustedExpected = totalAvgInBetween;
    const lastSectionAvg = secInfo[lastFilledSectionUri]?.averagePastDuration ?? null;
    const targetSectionAvg = secInfo[targetUri]?.averagePastDuration ?? null;

    if (adjustedExpected === 0 || lastSectionAvg == null || targetSectionAvg == null) {
      // Fall through to section-based logic
    } else {
      if (adjustedExpected === 0) return 'On track';
      if (isBefore) return `behind by ${adjustedExpected} min`;
      else return `ahead by ${Math.abs(adjustedExpected)} min`;
    }
  }

  // SECTION-BASED FALLBACK
  const sectionToIndex = new Map(Object.values(secInfo).map((s, i) => [s.uri, i]));
  // This is not post order. I think its simply pre-order. I just added this to get rid of compil errors.
  const targetSectionsWithIndices = entries
    .map((entry) => {
      const index = sectionToIndex.get(entry.targetSectionUri);
      return index !== undefined ? { targetSectionName: entry.targetSectionUri, index } : null;
    })
    .filter(Boolean) as Array<{ targetSectionName: string; index: number }>;

  let lastFilledSectionEntry: LectureEntry | null = null;
  for (const entry of entries) {
    if (entry.sectionUri) {
      lastFilledSectionEntry = entry;
    }
  }

  const lastFilledSectionIdx = sectionToIndex.get(lastFilledSectionEntry?.sectionUri ?? '') ?? -1;
  const lastEligibleTargetSectionIdx =
    sectionToIndex.get(lastFilledSectionEntry?.targetSectionUri ?? '') ?? -1;

  let progressStatus = '';
  if (lastEligibleTargetSectionIdx !== -1 && lastFilledSectionIdx !== -1) {
    let progressCovered = 0;
    let totalTarget = 0;

    for (const s of targetSectionsWithIndices) {
      if (s.index <= lastFilledSectionIdx) progressCovered++;
      if (s.index <= lastEligibleTargetSectionIdx) totalTarget++;
    }

    const isLastSectionInTargets = targetSectionsWithIndices.some(
      (s) => s.index === lastFilledSectionIdx
    );
    if (!isLastSectionInTargets) {
      progressCovered += 0.5;
    }

    const difference = progressCovered - totalTarget;
    const absDiff = Math.abs(difference);
    const roundedBottom = Math.floor(absDiff);
    const roundedUp = Math.ceil(absDiff);
    const fractionalPart = absDiff - roundedBottom;

    if (absDiff === 0) {
      progressStatus = 'On track';
    } else if (absDiff < 1) {
      progressStatus = difference > 0 ? 'slightly ahead' : 'slightly behind';
    } else if (fractionalPart < 0.9 && fractionalPart > 0) {
      const lecturesCount = difference > 0 ? roundedBottom : roundedUp;
      progressStatus = `Over ${lecturesCount} lecture${lecturesCount !== 1 ? 's' : ''} ${
        difference > 0 ? 'ahead' : 'behind'
      }`;
    } else {
      progressStatus = `${Math.round(absDiff)} lectures ${difference > 0 ? 'ahead' : 'behind'}`;
    }
  }

  return progressStatus || 'Progress unknown';
}

export function isTargetSectionUsed(entries: LectureEntry[]): boolean {
  return entries.some((entry) => entry.targetSectionUri);
}

export function countMissingTargetsInFuture(entries: LectureEntry[]): number {
  const now = dayjs();
  return entries.filter(
    (entry) => dayjs(entry.timestamp_ms).isAfter(now, 'day') && !entry.targetSectionUri
  ).length;
}

export const getProgressStatusColor = (status: string) => {
  if (status.includes('ahead')) return 'success.main';
  if (status.includes('behind')) return 'error.main';
  if (status.includes('on track')) return 'success.main';
  return 'info.main';
};