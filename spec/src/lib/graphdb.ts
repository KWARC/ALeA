import axios from 'axios';
import { getAuthHeaders } from './lmp';
import { SparqlResponse } from './flams';

export async function runGraphDbSelectQuery(query: string) {
  const res = await axios.post(
    '/api/gpt-redirect',
    { query },
    {
      params: {
        apiname: 'graphdb-sparql-select',
        projectName: 'quiz-gen',
      },
      headers: getAuthHeaders(),
    }
  );
  return res.data as SparqlResponse;
}

export async function runGraphDbUpdateQuery(query: string) {
   await axios.post(
    '/api/gpt-redirect',
    { query },
    {
      params: {
        apiname: 'graphdb-sparql-update',
        projectName: 'quiz-gen',
      },
      headers: getAuthHeaders(),
    }
  );
}
