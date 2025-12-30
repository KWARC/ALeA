import axios, { AxiosError } from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError } from './comment-utils';
import { SERVER_TO_ADDRESS } from '@alea/spec';

export async function lmpRedirect(
  server: 'lmp' | 'auth',
  apiUrl: string,
  requestType: 'GET' | 'POST',
  defaultVal: any,
  data?: any,
  token?: string
) {
  if (!token) return defaultVal;
  const headers = {
    Authorization: `JWT ${token}`,
  };
  const serverAddress = SERVER_TO_ADDRESS[server];
  const fullUrl = `${serverAddress}/${apiUrl}`;
  const resp =
    requestType === 'POST'
      ? await axios.post(fullUrl, data, { headers })
      : await axios.get(fullUrl, { headers });
  return resp.data;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  try {
    const { server, apiUrl, requestType, defaultVal, data } = req.body;
    const token = req.cookies?.access_token;
    const result = await lmpRedirect(
      server,
      apiUrl,
      requestType,
      defaultVal,
      data,
      token
    );
    return res.status(200).json(result);
  } catch (err) {
    const error = err as Error | AxiosError;
    if (axios.isAxiosError(error)) {
      return res.status(error.response?.status || 500).json({
        error: error.response?.data || 'Internal Server Error',
      });
    } else {
      console.error('LMP Redirect Error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
