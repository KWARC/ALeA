import { type GetStudyBuddiesResponse, type StudyBuddy } from '@alea/spec';
import { commentsDb } from './comments-db';

const SENT_STATUS = 'sent';
const RECEIVED_STATUS = 'received';
const CONNECTED_STATUS = 'connected';

export type StudyBuddyScope = {
  userId: string;
  courseId: string;
  institutionId: string;
  instanceId: string;
};

export type StudyBuddyProfileParams = StudyBuddyScope & {
  userName: string;
  studyBuddy: StudyBuddy;
};

export type StudyBuddyDbExecutor = {
  query<T>(query: string, values: unknown[]): Promise<T>;
  execute(query: string, values: unknown[]): Promise<unknown>;
};

type ColumnCountRow = {
  columnCount: number | string | bigint;
};

const prismaStudyBuddyDb: StudyBuddyDbExecutor = {
  query: (query, values) => commentsDb.$queryRawUnsafe(query, ...values),
  execute: (query, values) => commentsDb.$executeRawUnsafe(query, ...values),
};

function getLegacySbCourseId(courseId: string, instanceId: string) {
  return `${courseId}||${instanceId}`;
}

async function tableHasColumn(db: StudyBuddyDbExecutor, tableName: string, columnName: string) {
  const rows = await db.query<ColumnCountRow[]>(
    'SELECT COUNT(*) as columnCount FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',
    [tableName, columnName]
  );
  const columnCount = rows[0]?.columnCount ?? 0;
  return Number(columnCount) > 0;
}

export async function getStudyBuddyUserInfoFromDb(
  { userId, courseId, institutionId, instanceId }: StudyBuddyScope,
  db: StudyBuddyDbExecutor = prismaStudyBuddyDb
) {
  const results = await db.query<StudyBuddy[]>(
    'SELECT * FROM StudyBuddyUsers WHERE userId=? AND courseId=? AND instanceId=? AND institutionId=?',
    [userId, courseId, instanceId, institutionId]
  );

  return results[0];
}

export async function updateStudyBuddyInfoInDb(
  { userId, userName, courseId, institutionId, instanceId, studyBuddy }: StudyBuddyProfileParams,
  db: StudyBuddyDbExecutor = prismaStudyBuddyDb
) {
  const { intro, studyProgram, email, semester, meetType, languages, dayPreference } = studyBuddy;
  const hasLegacySbCourseId = await tableHasColumn(db, 'StudyBuddyUsers', 'sbCourseId');

  if (hasLegacySbCourseId) {
    await db.execute(
      'REPLACE INTO StudyBuddyUsers (userName, intro, studyProgram, email, semester, meetType, languages, dayPreference, active, userId, sbCourseId, courseId, instanceId, institutionId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        userName,
        intro,
        studyProgram,
        email,
        semester,
        meetType,
        languages,
        dayPreference,
        true,
        userId,
        getLegacySbCourseId(courseId, instanceId),
        courseId,
        instanceId,
        institutionId,
      ]
    );
    return;
  }

  await db.execute(
    'REPLACE INTO StudyBuddyUsers (userName, intro, studyProgram, email, semester, meetType, languages, dayPreference, active, userId, courseId, instanceId, institutionId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      userName,
      intro,
      studyProgram,
      email,
      semester,
      meetType,
      languages,
      dayPreference,
      true,
      userId,
      courseId,
      instanceId,
      institutionId,
    ]
  );
}

export async function getStudyBuddyListFromDb(
  { userId, courseId, institutionId, instanceId }: StudyBuddyScope,
  db: StudyBuddyDbExecutor = prismaStudyBuddyDb
): Promise<GetStudyBuddiesResponse> {
  const receivedRequests = await db.query<{ senderId: string }[]>(
    'SELECT senderId FROM StudyBuddyConnections WHERE receiverId=? AND courseId=? AND instanceId=? AND institutionId=?',
    [userId, courseId, instanceId, institutionId]
  );

  const sentRequests = await db.query<{ receiverId: string }[]>(
    'SELECT receiverId FROM StudyBuddyConnections WHERE senderId=? AND courseId=? AND instanceId=? AND institutionId=?',
    [userId, courseId, instanceId, institutionId]
  );

  const allStudyBuddies = await db.query<StudyBuddy[]>(
    'SELECT * FROM StudyBuddyUsers WHERE NOT userId=? AND courseId=? AND instanceId=? AND institutionId=? AND active=?',
    [userId, courseId, instanceId, institutionId, true]
  );

  const userStatuses = new Map<string, string>();
  for (const row of receivedRequests) {
    userStatuses.set(row.senderId, RECEIVED_STATUS);
  }

  for (const row of sentRequests) {
    if (userStatuses.has(row.receiverId)) {
      userStatuses.set(row.receiverId, CONNECTED_STATUS);
    } else {
      userStatuses.set(row.receiverId, SENT_STATUS);
    }
  }

  const connected: StudyBuddy[] = [];
  const requestSent: StudyBuddy[] = [];
  const requestReceived: StudyBuddy[] = [];
  const other: StudyBuddy[] = [];

  for (const buddy of allStudyBuddies) {
    const status = userStatuses.get(buddy.userId);
    if (status === CONNECTED_STATUS) {
      connected.push(buddy);
      continue;
    }

    const buddyWithoutEmail = {
      ...buddy,
      email: undefined as unknown as string,
    };

    if (status === SENT_STATUS) {
      requestSent.push(buddyWithoutEmail);
    } else if (status === RECEIVED_STATUS) {
      requestReceived.push(buddyWithoutEmail);
    } else {
      other.push(buddyWithoutEmail);
    }
  }

  return {
    courseId,
    connected,
    requestSent,
    requestReceived,
    other,
  };
}

export async function sendStudyBuddyConnectionRequestInDb(
  {
    userId,
    receiverId,
    courseId,
    institutionId,
    instanceId,
  }: StudyBuddyScope & { receiverId: string },
  db: StudyBuddyDbExecutor = prismaStudyBuddyDb
) {
  const hasLegacySbCourseId = await tableHasColumn(db, 'StudyBuddyConnections', 'sbCourseId');

  if (hasLegacySbCourseId) {
    await db.execute(
      'INSERT INTO StudyBuddyConnections(senderId, receiverId, sbCourseId, courseId, instanceId, institutionId) VALUES (?, ?, ?, ?, ?, ?)',
      [
        userId,
        receiverId,
        getLegacySbCourseId(courseId, instanceId),
        courseId,
        instanceId,
        institutionId,
      ]
    );
    return;
  }

  await db.execute(
    'INSERT INTO StudyBuddyConnections(senderId, receiverId, courseId, instanceId, institutionId) VALUES (?, ?, ?, ?, ?)',
    [userId, receiverId, courseId, instanceId, institutionId]
  );
}

export async function removeStudyBuddyConnectionRequestFromDb(
  {
    userId,
    receiverId,
    courseId,
    institutionId,
    instanceId,
  }: StudyBuddyScope & { receiverId: string },
  db: StudyBuddyDbExecutor = prismaStudyBuddyDb
) {
  await db.execute(
    'DELETE FROM StudyBuddyConnections WHERE senderId=? AND receiverId=? AND courseId=? AND instanceId=? AND institutionId=?',
    [userId, receiverId, courseId, instanceId, institutionId]
  );
}

export async function setStudyBuddyActiveInDb(
  { userId, active, courseId, institutionId, instanceId }: StudyBuddyScope & { active: boolean },
  db: StudyBuddyDbExecutor = prismaStudyBuddyDb
) {
  await db.execute(
    'UPDATE StudyBuddyUsers SET active=? WHERE userId=? AND courseId=? AND instanceId=? AND institutionId=?',
    [active, userId, courseId, instanceId, institutionId]
  );
}
