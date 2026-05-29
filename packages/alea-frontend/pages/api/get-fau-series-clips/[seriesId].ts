import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';

const FAU_TV_SERIES_CLIPS_BASE_URL = 'https://api.video.uni-erlangen.de/api/pub/v1/series';

interface FAUClip {
  id: number;
  recording_date: string;
  title: string;
}

export async function getSeriesClips(seriesId: string): Promise<FAUClip[]> {
  const url = `${FAU_TV_SERIES_CLIPS_BASE_URL}/${seriesId}/clips`;
  const { data } = await axios.get(url);
  return data.data || [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { seriesId } = req.query;

  if (!seriesId || typeof seriesId !== 'string') {
    return res.status(422).json({ error: 'Missing or invalid seriesId' });
  }

  try {
    const clips = await getSeriesClips(seriesId);
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(clips);
  } catch (error) {
    console.error(`Failed to fetch series clips for ${seriesId}:`, error);
    res.status(500).json({ error: 'Failed to fetch series clips' });
  }
}

