import axios from 'axios';
import mysql from 'serverless-mysql';

const db = mysql({
  config: {
    host: process.env.MYSQL_HOST,
    port: +(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_GRADING_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
  },
});

const QUIZ_ID = process.env.LOADTEST_QUIZ_ID || 'quiz-2b2e11c1';
const COURSE_ID = process.env.LOADTEST_COURSE_ID || 'ai-1';
const COURSE_TERM = process.env.LOADTEST_COURSE_TERM || 'WS25-26';
const BASE_URL = process.env.LOADTEST_BASE_URL || 'https://alea.education';
const JWT = process.env.LOADTEST_JWT;
const X1 = 1; // req/sec for get-quiz-stats
const X2 = 1; // req/sec for get-quiz (with targetUserId)
const X3 = 1; // req/sec for get-previous-quiz-info

type EndpointMetrics = {
  inFlight: number;
  completed: number;
  failed: number;
  totalLatencyMs: number;
};

const metricsByLabel: Record<string, EndpointMetrics> = {};

if (!JWT) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing JWT. Please set one of LOADTEST_JWT, JWT, AUTH_TOKEN, or ACCESS_TOKEN environment variables.'
  );
  process.exit(1);
}

function createAuthHeaders() {
  return {
    Authorization: `JWT ${JWT}`,
  };
}

async function getTargetUserIds(quizId: string): Promise<string[]> {
  const rows = await db.query<{ userId: string }[]>(
    `SELECT DISTINCT userId
     FROM grading
     WHERE quizId = ?`,
    [quizId]
  );

  if (!rows || !Array.isArray(rows)) {
    return [];
  }
  return rows.map((r) => r.userId).filter(Boolean);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function ensureMetrics(label: string): EndpointMetrics {
  if (!metricsByLabel[label]) {
    metricsByLabel[label] = {
      inFlight: 0,
      completed: 0,
      failed: 0,
      totalLatencyMs: 0,
    };
  }
  return metricsByLabel[label];
}

function scheduleRequests(label: string, requestsPerSecond: number, fn: () => Promise<void>): void {
  if (!requestsPerSecond || requestsPerSecond <= 0) {
    // eslint-disable-next-line no-console
    console.log(`${label}: rate set to 0, skipping.`);
    return;
  }

  const intervalMs = 1000 / requestsPerSecond;
  // eslint-disable-next-line no-console
  console.log(`${label}: scheduling ~${requestsPerSecond} req/sec (every ${intervalMs} ms).`);

  setInterval(async () => {
    const m = ensureMetrics(label);
    const start = Date.now();
    m.inFlight += 1;
    try {
      await fn();
      m.completed += 1;
      m.totalLatencyMs += Date.now() - start;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`${label} request failed:`, err);
      m.failed += 1;
    }
    m.inFlight -= 1;
  }, intervalMs);
}

async function requestGetQuizStats() {
  const url = new URL(`${BASE_URL}/api/quiz/get-quiz-stats/${QUIZ_ID}`);
  url.searchParams.set('courseId', COURSE_ID);
  url.searchParams.set('courseTerm', COURSE_TERM);

  const resp = await axios.get(url.toString(), {
    headers: createAuthHeaders(),
    validateStatus: () => true,
  });
  if (resp.status >= 400) {
    // eslint-disable-next-line no-console
    console.error('get-quiz-stats error status:', resp.status);
  }
}

async function requestGetQuiz(targetUserIds: string[]) {
  if (!targetUserIds.length) {
    // eslint-disable-next-line no-console
    console.warn('No targetUserIds available for get-quiz requests.');
    return;
  }

  const targetUserId = pickRandom(targetUserIds);
  const url = new URL(`${BASE_URL}/api/quiz/get-quiz/${encodeURIComponent(QUIZ_ID)}`);
  url.searchParams.set('targetUserId', targetUserId);

  const resp = await axios.get(url.toString(), {
    headers: createAuthHeaders(),
    validateStatus: () => true,
  });
  if (resp.status >= 400) {
    // eslint-disable-next-line no-console
    console.error('get-quiz error status:', resp.status, 'targetUserId:', targetUserId);
  }
}

async function requestGetPreviousQuizInfo() {
  const url = new URL(
    `${BASE_URL}/api/quiz/get-previous-quiz-info/${encodeURIComponent(COURSE_ID)}`
  );

  const resp = await axios.get(url.toString(), {
    headers: createAuthHeaders(),
    validateStatus: () => true,
  });
  if (resp.status >= 400) {
    // eslint-disable-next-line no-console
    console.error('get-previous-quiz-info error status:', resp.status);
  }
}

export async function loadTest() {
  // eslint-disable-next-line no-console
  console.log('Starting load test with quizId:', QUIZ_ID, 'courseId:', COURSE_ID);

  const targetUserIds = await getTargetUserIds(QUIZ_ID);
  if (!targetUserIds.length) {
    // eslint-disable-next-line no-console
    console.warn(
      `No targetUserIds found for quizId=${QUIZ_ID}. get-quiz calls with targetUserId will be skipped until data exists.`
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(`Found ${targetUserIds.length} targetUserIds for quizId=${QUIZ_ID}.`);
  }

  // Schedule the three APIs at the configured rates. These run indefinitely until the process is stopped.
  scheduleRequests('get-quiz-stats', X1, () => requestGetQuizStats());
  scheduleRequests('get-quiz', X2, () => requestGetQuiz(targetUserIds));
  scheduleRequests('get-previous-quiz-info', X3, () => requestGetPreviousQuizInfo());

  // Periodically report metrics
  setInterval(() => {
    // eslint-disable-next-line no-console
    console.log('=== Load test metrics (last 10s window cumulative) ===');
    Object.entries(metricsByLabel).forEach(([label, m]) => {
      const avgLatency =
        m.completed > 0 ? `${(m.totalLatencyMs / m.completed).toFixed(1)} ms` : 'n/a';
      // eslint-disable-next-line no-console
      console.log(
        `${label}: inFlight=${m.inFlight}, completed=${m.completed}, failed=${m.failed}, avgLatency=${avgLatency}`
      );
    });
  }, 10_000);

  // Keep process alive; intervals already do this. Also handle graceful shutdown.
  const shutdown = async () => {
    // eslint-disable-next-line no-console
    console.log('Shutting down load test...');
    try {
      await db.end();
    } catch {
      // ignore
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
