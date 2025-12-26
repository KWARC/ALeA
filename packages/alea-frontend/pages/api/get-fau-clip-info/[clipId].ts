import { ClipDetails } from '@alea/spec';
import axios from 'axios';

interface CachedObject {
  cacheTimeMs: number;
  videoInfo: ClipDetails;
}

const CACHED_CLIP_INFO = new Map<string, CachedObject>();
const FAU_TV_OEMBED_BASE_URL = 'https://api.video.uni-erlangen.de/services/oembed';
const FAU_TV_BASE_URL = 'https://www.fau.tv';

function isFresh(cachedObject: CachedObject) {
  if (!cachedObject) return false;
  const MAX_CACHE_STALENESS_MS = 60 * 60 * 1000; // 1 hour
  return Date.now() - cachedObject.cacheTimeMs < MAX_CACHE_STALENESS_MS;
}

export async function getVideoInfo(clipId: string): Promise<ClipDetails> {
  const url = `${FAU_TV_OEMBED_BASE_URL}?url=${FAU_TV_BASE_URL}/clip/id/${clipId}&format=json`;
  const { data } = await axios.get(url);
  //TODO: Hack: for now FAU TV api provides 360p,720p and 1080p url for only presenter view
  //TODO:  In both presenter+presentation view FAU TV provide only one url , so adding that only as of now.
  const presenterUrl: string | undefined =
    (data && (data.presenter_url as string)) || (data && (data.file as string)) || undefined;
  const presentationUrl: string | undefined =
    data && (data.presentation_url as string) ? (data.presentation_url as string) : undefined;
  const compositeUrl: string | undefined =
    data && (data.composite_url as string) ? (data.composite_url as string) : undefined;

  const videoInfo: ClipDetails = {
    // r360: data.alternative_Video_size_small_url || undefined,
    // r720: data.alternative_Video_size_medium_url || undefined,
    // r1080: data.alternative_Video_size_large_url || undefined,
    r360: presenterUrl,
    r720: presenterUrl,
    r1080: presenterUrl,
    subtitles: {
      default: data.transcript || undefined,
      en: data.transcript_en || undefined,
      de: data.transcript_de || undefined,
    },
    thumbnailUrl: data.thumbnail_url || undefined,
    presenterUrl,
    presentationUrl,
    compositeUrl,
  };
  return videoInfo;
}

async function getVideoInfoCached(clipId: string) {
  const cachedInfo = CACHED_CLIP_INFO.get(clipId);
  if (isFresh(cachedInfo)) return cachedInfo.videoInfo;

  const videoInfo = await getVideoInfo(clipId);
  if (!videoInfo) throw new Error(`Video info not found for clip ${clipId}`);
  CACHED_CLIP_INFO.set(clipId, {
    cacheTimeMs: Date.now(),
    videoInfo: videoInfo,
  });
  return videoInfo;
}

export default async function handler(req, res) {
  const { clipId } = req.query;
  if (!clipId) return res.status(422).json({ error: 'Missing clipId' });
  try {
    const videoInfo = await getVideoInfoCached(clipId);
    res.status(200).json(videoInfo);
  } catch (error) {
    console.error(`Failed to fetch video info for ${clipId}:`, error);
    res.status(500).json({ error: 'Failed to fetch video info' });
  }
}
