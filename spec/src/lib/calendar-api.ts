import axios from 'axios';

export interface CalendarSecretResponse {
  calendarSecret: string;
}

export async function createAndGetSecret(): Promise<CalendarSecretResponse> {
  const resp = await axios.post('/api/calendar/create-and-get-secret', {});
  return resp.data as CalendarSecretResponse;
}

export async function refreshCalendarSecret(): Promise<CalendarSecretResponse> {
  const resp = await axios.post('/api/calendar/refresh-secret', {});
  return resp.data as CalendarSecretResponse;
}
