import { ClipDetails } from '@stex-react/spec';
import axios from 'axios';

interface CachedObject {
  cacheTimeMs: number;
  videoInfo: ClipDetails;
}

const CACHED_CLIP_INFO = new Map<string, CachedObject>();

function isFresh(cachedObject: CachedObject) {
  if (!cachedObject) return false;
  const MAX_CACHE_STALENESS_MS = 60 * 60 * 1000; // 1 hour
  return Date.now() - cachedObject.cacheTimeMs < MAX_CACHE_STALENESS_MS;
}

async function getVideoInfo(clipId: string) {
  const clipUrl = `https://www.fau.tv/clip/id/${clipId}`;
  const clipPageContent = (await axios.get(clipUrl)).data;
  const videoLinks = clipPageContent.match(
    /www.fau.tv\/webplayer\/id\/([^&]+)\S+maxheight=([0-9]+)/g
  );
  if (!videoLinks?.length) return;
  const videoInfo = {};
  for (const link of videoLinks) {
    const group = /www.fau.tv\/webplayer\/id\/([^&]+)\S+maxheight=([0-9]+)/gm.exec(link);
    const res = group[2];
    const id = group[1];
    const embedableLink = `https://api.video.uni-erlangen.de/services/oembed?url=https://www.fau.tv/webplayer/id/${id}&format=iframe`;
    const embedableLinkData = (await axios.get(embedableLink)).data;

    const matches = /http\S+m4v/gm.exec(embedableLinkData);
    // There are multiple video versions. Eg "Slides and video", "Slides only" etc.
    // Hope that the first link is always "Slides & Video"
    if (matches?.[0] && !videoInfo['r' + res]) videoInfo['r' + res] = matches[0];
  }
  const subLinks = clipPageContent.match(/http.*vosk-cc.vtt/g);
  const uniqSubLinks = [...new Set(subLinks || [])];

  if (uniqSubLinks.length >= 2) {
    console.error('More than one subtitle for video');
  }
  if (uniqSubLinks.length === 1) videoInfo['sub'] = uniqSubLinks[0];
  return videoInfo;
}

async function getVideoInfoCached(clipId: string) {
  const cachedInfo = CACHED_CLIP_INFO.get(clipId);
  if (isFresh(cachedInfo)) return cachedInfo.videoInfo;

  const videoInfo = await getVideoInfo(clipId);
  CACHED_CLIP_INFO.set(clipId, {
    cacheTimeMs: Date.now(),
    videoInfo: videoInfo,
  });
  return videoInfo;
}

export default async function handler(req, res) {
  const { clipId } = req.query;
  const videoInfo = await getVideoInfoCached(clipId);
  res.status(200).json(videoInfo);
}
