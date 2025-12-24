import type { NextApiRequest, NextApiResponse } from 'next';

type GetResponse = { useRdfEncodeUri: boolean };

let useRdfEncodeUri = false;

export function getUseRdfEncodeUri() {
  return useRdfEncodeUri;
}

export function setUseRdfEncodeUri(value: boolean) {
  useRdfEncodeUri = value;
}

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponse<GetResponse>
) {
  return res.status(200).json({ useRdfEncodeUri });
}


