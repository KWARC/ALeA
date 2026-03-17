import { PrismaClient } from '@prisma/comments-client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

function getCommentsDatabaseUrl(): string {
  const host = process.env.MYSQL_HOST ;
  const port = process.env.MYSQL_PORT ;
  const user = process.env.MYSQL_USER ;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_COMMENTS_DATABASE ;
  return `mysql://${user}:${password}@${host}:${port}/${database}`;
}

const adapter = new PrismaMariaDb(getCommentsDatabaseUrl());

const globalForPrisma = globalThis as unknown as { commentsDb: PrismaClient };
export const commentsDb =
  globalForPrisma.commentsDb ?? new PrismaClient({ adapter });
if (process.env.NEXT_PUBLIC_SITE_VERSION !== 'production') {
  globalForPrisma.commentsDb = commentsDb;
}
