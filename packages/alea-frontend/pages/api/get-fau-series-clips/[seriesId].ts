import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
const FAU_TV_SERIES_CLIPS_BASE_URL = 'https://api.video.uni-erlangen.de/api/pub/v1/series';

interface FAUClip {
  id: number;
  recording_date: string;
  title: string;
}

interface CachedObject {
  cacheTimeMs: number;
  clips: FAUClip[];
}

const CACHED_SERIES_CLIPS = new Map<string, CachedObject>();

function isFresh(cachedObject: CachedObject) {
  if (!cachedObject) return false;
  const MAX_CACHE_STALENESS_MS = 60 * 60 * 1000;
  return Date.now() - cachedObject.cacheTimeMs < MAX_CACHE_STALENESS_MS;
}

export async function getSeriesClips(seriesId: string): Promise<FAUClip[]> {
  const url = `${FAU_TV_SERIES_CLIPS_BASE_URL}/${seriesId}/clips`;
  const { data } = await axios.get(url);
  return data.data || [];
}

async function getSeriesClipsCached(seriesId: string) {
  const cachedInfo = CACHED_SERIES_CLIPS.get(seriesId);
  if (isFresh(cachedInfo)) return cachedInfo.clips;

  const clips = await getSeriesClips(seriesId);
  if (!clips) throw new Error(`Series clips not found for series ${seriesId}`);

  CACHED_SERIES_CLIPS.set(seriesId, {
    cacheTimeMs: Date.now(),
    clips,
  });
  return clips;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { seriesId } = req.query;

  if (!seriesId || typeof seriesId !== 'string') {
    return res.status(422).json({ error: 'Missing or invalid seriesId' });
  }
  try {
    const clips = await getSeriesClipsCached(seriesId);
    res.status(200).json(clips);
  } catch (error) {
    console.error(`Failed to fetch series clips for ${seriesId}:`, error);
    res.status(500).json({ error: 'Failed to fetch series clips' });
  }
}
