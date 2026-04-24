import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { seriesId } = req.query;

  if (!seriesId || typeof seriesId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid seriesId' });
  }

  try {
    let allClips: any[] = [];
    let currentPage = 1;
    let lastPage = 1;
    const MAX_PAGES = 10;

    do {
      const url = `https://api.video.uni-erlangen.de/api/pub/v1/series/${seriesId}/clips?page=${currentPage}`;
      const { data } = await axios.get(url);

      if (data && data.data) {
        allClips = [...allClips, ...data.data];
      }

      if (data && data.meta && data.meta.last_page) {
        lastPage = data.meta.last_page;
      } else {
        break;
      }

      currentPage++;
    } while (currentPage <= lastPage && currentPage <= MAX_PAGES);

    res.status(200).json(allClips);
  } catch (error) {
    console.error(`Failed to fetch clips for series ${seriesId}:`, error);
    res.status(500).json({ error: 'Failed to fetch clips from FAU.tv' });
  }
}
