import { NextApiRequest, NextApiResponse } from 'next';
import { readFile } from 'fs/promises';
import path from 'path';

interface MatchedSlide {
  timestamp: string;
  ocr_text: string;
  start_time: number;
  end_time: number;
  slide_matched: {
    sectionId: string;
    sectionTitle: string;
    slideUri: string;
    slideContent: string;
  };
}

interface UnmatchedSlide {
  timestamp: string;
  ocr_text: string;
  start_time: number;
  end_time: number;
}

interface VideoStats {
  total: number;
  matched: number;
  unmatched: number;
  match_percent: number;
}

interface VideoData {
  matched: MatchedSlide[];
  unmatched: UnmatchedSlide[];
  stats: VideoStats;
}

interface CourseData {
  subject: string;
  semester: string;
  videos: {
    [videoId: string]: VideoData;
  };
}

interface MatchReportData {
  [courseKey: string]: CourseData;
}

type SuccessResponse = MatchReportData;

type ErrorResponse = {
  error: string;
  message: string;
};

type ApiResponse = SuccessResponse | ErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const videoToSlidesMapDir = process.env.VIDEO_TO_SLIDES_MAP_DIR;
    
    if (!videoToSlidesMapDir) {
      throw new Error('VIDEO_TO_SLIDES_MAP_DIR environment variable not set');
    }

    const dataPath = path.join(videoToSlidesMapDir, 'all_detailed_match_reports.json');
    const fileData = await readFile(dataPath, 'utf-8');
    const data: MatchReportData = JSON.parse(fileData);
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error loading match report data:', error);
    res.status(500).json({ 
      error: 'Failed to load match report data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}