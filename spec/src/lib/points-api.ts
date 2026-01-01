import axios from 'axios';
import { GrantReason } from './points';

export async function grantPoints(commentId: number, points: number, reason: GrantReason) {
  return await axios.post('/api/grant-points', { commentId, reason, points });
}
