import { CoverageTimeline, LectureEntry } from '@alea/utils';
import axios from 'axios';
interface CoverageUpdatePayload {
  courseId: string;
  updatedEntry?: LectureEntry;
  timestamp_ms?: number;
  action?: 'upsert' | 'delete';
  notCoveredSections?: string[];
}

let coverageTimelineCache: CoverageTimeline | undefined = undefined;
let coverageTimelineCacheTS: number | undefined = undefined;
const COVERAGE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function isCacheValid(): boolean {
  if (!coverageTimelineCache || !coverageTimelineCacheTS) return false;
  return Date.now() < coverageTimelineCacheTS + COVERAGE_CACHE_TTL;
}

export async function getCoverageTimeline(forceRefresh = false): Promise<CoverageTimeline> {
  if (!forceRefresh && isCacheValid()) {
    return coverageTimelineCache!;
  }
  const response = await axios.get('/api/get-coverage-timeline');
  const coverageTimeline = response.data as CoverageTimeline;
  coverageTimelineCache = coverageTimeline;
  coverageTimelineCacheTS = Date.now();
  return coverageTimeline;
}

export async function updateCoverageTimeline(payload: CoverageUpdatePayload) {
  const finalPayload = {
    action: payload.action || 'upsert',
    courseId: payload.courseId,
    ...(payload.updatedEntry && { updatedEntry: payload.updatedEntry }),
    ...(payload.timestamp_ms && { timestamp_ms: payload.timestamp_ms }),
    ...(payload.notCoveredSections && { notCoveredSections: payload.notCoveredSections }),
  };
  return axios.post('/api/set-coverage-timeline', finalPayload);
}
