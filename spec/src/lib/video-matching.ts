import axios from 'axios';

export interface MatchedSlide {
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

export interface UnmatchedSlide {
  timestamp: string;
  ocr_text: string;
  start_time: number;
  end_time: number;
}

export interface VideoStats {
  total: number;
  matched: number;
  unmatched: number;
  match_percent: number;
}

export interface VideoData {
  matched: MatchedSlide[];
  unmatched: UnmatchedSlide[];
  stats: VideoStats;
}

export interface CourseData {
  subject: string;
  semester: string;
  videos: {
    [videoId: string]: VideoData;
  };
}

export interface MatchReportData {
  [courseKey: string]: CourseData;
}

export async function getVideoMatchingData() {
  const resp = await axios.get(`/api/get-video-matching`);
  return resp.data as MatchReportData;
}