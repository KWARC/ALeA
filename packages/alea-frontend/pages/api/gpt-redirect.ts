import axios, { Method } from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserId } from './comment-utils';

const INJECT_USERID_APIS = new Set(['post-feedback']);
function apiNameToPath(apiName: string, projectName?: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_GPT_URL ?? '';
  return projectName ? `${baseUrl}/${projectName}/${apiName}` : `${baseUrl}/api/${apiName}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method, body } = req;
    const { apiname, projectName, ...otherQueryParams } = req.query; // The URL to forward the request to

    if (!apiname || typeof apiname !== 'string') {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    const queryString = Object.entries(otherQueryParams)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`)
      .join('&');
    const url = `${apiNameToPath(apiname, projectName as string)}${
      queryString ? `?${queryString}` : ''
    }`;

    const isBodyMethod = method?.toUpperCase() !== 'GET';
    const userId = await getUserId(req);
    let finalBody = body;
    if (isBodyMethod && INJECT_USERID_APIS.has(apiname)) {
      finalBody = { ...body, userId };
    }

    const headers: Record<string, string> = {
      Authorization: req.headers.authorization || '',
      ...(isBodyMethod && { 'Content-Type': 'application/json' }),
    };

    const axiosConfig = {
      method: method as Method,
      url,
      headers,
      data: finalBody,
    };
    console.log('Proxying request:', axiosConfig);

    const response = await axios(axiosConfig);
    const responseData = response.data;

    return res.status(response.status).json(responseData);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
