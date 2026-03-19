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

function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
    );
  }
  return obj;
}

function autoParseJson(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string' || Buffer.isBuffer(obj)) {
    const str = obj.toString().trim();
    if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
      try {
        const parsed = JSON.parse(str);
        return autoParseJson(parsed);
      } catch {
        return obj; 
      }
    }
  }

  if (Array.isArray(obj)) return obj.map(autoParseJson);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, autoParseJson(value)])
    );
  }
  return obj;
}

const globalTransform = async ({ args, query }: any) => {
  const result = await query(args);
  const parsed = autoParseJson(result);
  return serializeBigInt(parsed);
};

const adapter = new PrismaMariaDb(getCommentsDatabaseUrl());
const baseClient = new PrismaClient({ adapter });

export const commentsDb = baseClient.$extends({
  query: {
    $allModels: { $allOperations: globalTransform },
    $queryRaw: globalTransform,
    $executeRaw: globalTransform,
  },
});

type ExtendedPrismaClient = typeof commentsDb;
const globalForPrisma = globalThis as unknown as { commentsDb: ExtendedPrismaClient };
if (process.env.NEXT_PUBLIC_SITE_VERSION !== 'production') {
  globalForPrisma.commentsDb = commentsDb;
}
