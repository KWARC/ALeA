import { executeQuery } from '../../comment-utils';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Only GET requests allowed' });
  }

  const { universityId } = req.query;

  if (!universityId || typeof universityId !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Missing or invalid universityId',
    });
  }

  try {
    const result = await executeQuery<Array<{ instanceId: string }>>(
      `SELECT DISTINCT instanceId FROM semesterInfo WHERE universityId = ?`,
      [universityId]
    );

    if ('error' in result) {
      return res.status(500).json({
        success: false,
        message: 'Database error while fetching instances',
        error: result.error,
      });
    }

    const instanceArray = result.map((r) => r.instanceId);

    return res.status(200).json({
      success: true,
      message: 'Instances fetched successfully',
      data: instanceArray,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
