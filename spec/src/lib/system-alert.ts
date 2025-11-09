import axios from 'axios';
import { getAuthHeaders } from './lmp';

export interface EndpointStatus {
  last_success_time?: number;
  last_failure_time?: number;
  last_alert_time?: number;
  current_error?: string | null;
}

export type MonitorStatus = Record<string, EndpointStatus>;

export interface MonitorResponse {
  monitor: MonitorStatus;
}

export type AlertSeverity = 'info' | 'warning' | 'error';

export interface SystemAlert {
  message: string | null;
  severity: AlertSeverity;
}

export async function getMonitorStatus(): Promise<MonitorResponse> {
  const res = await axios.get('/api/sys-admin/monitor-message', {
    headers: getAuthHeaders(),
  });

  return res.data as MonitorResponse;
}

export async function getSystemAlert(): Promise<SystemAlert> {
  const res = await axios.get('/api/system-alert/get-system-alert', {
    headers: getAuthHeaders(),
  });

  return res.data as SystemAlert;
}

export async function updateSystemAlert(data: SystemAlert) {
  const res = await axios.post('/api/system-alert/update-system-alert', data, {
    headers: getAuthHeaders(),
  });

  return res.data;
}
