import axios from 'axios';

export interface FauClip {
  id: number | string;
  recording_date: string;
}
export async function getFauSeriesClips(seriesId: string): Promise<FauClip[]> {
  const response = await axios.get(`/api/get-fau-series-clips/${seriesId}`);
  return response.data;
}

