import axios from 'axios';
import { Notification } from './notifications';
import { isLoggedInViaCookie } from '@alea/utils';

export async function getUserNotifications(locale: string) {
  if (!isLoggedInViaCookie()) return [];
  const url = `/api/get-user-notifications/${locale}`;
  return axios.get(url).then((response) => response.data as Notification[]);
}

export async function purgeUserNotifications() {
  const url = '/api/purge-user-notifications';
  return await axios.post(url, undefined);
}

export async function getNotificationSeenTime() {
  const url = '/api/get-notificationseen-time';
  return axios.get(url).then((response) => response.data);
}

export async function updateNotificationSeenTime(newTimestamp: string) {
  const url = `/api/update-notificationseen-time`;
  const data = { newTimestamp: newTimestamp };

  return axios.post(url, data).then((response) => response.data);
}
