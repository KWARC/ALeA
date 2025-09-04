import axios from 'axios';
import { getAuthHeaders, isLoggedIn } from './lmp';
import { Notification } from './notifications';

export async function getUserNotifications(locale: string) {
  if (!isLoggedIn()) return [];
  const url = `/api/get-user-notifications/${locale}`;
  return axios
    .get(url, { headers: getAuthHeaders() })
    .then((response) => response.data as Notification[]);
}

export async function purgeUserNotifications() {
  const url = '/api/purge-user-notifications';
  return await axios.post(url, undefined, {
    headers: getAuthHeaders(),
  });
}

export async function getNotificationSeenTime() {
  const url = '/api/get-notificationseen-time';
  return axios.get(url, { headers: getAuthHeaders() }).then((response) => response.data);
}

export async function updateNotificationSeenTime(newTimestamp: string) {
  const url = `/api/update-notificationseen-time`;
  const data = { newTimestamp: newTimestamp };

  return axios.post(url, data, { headers: getAuthHeaders() }).then((response) => response.data);
}
