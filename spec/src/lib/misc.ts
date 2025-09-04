export interface SyllabusRow {
  timestamp_ms: number;
  topics: string;
  clipId?: string;
}
export interface GetHistoricalSyllabusResponse {
  [semester: string]: SyllabusRow[];
}
