import { config } from 'dotenv';
// Load from alea-frontend .env.local so Prisma CLI picks up COMMENTS_DATABASE_URL
config({ path: 'packages/alea-frontend/.env.local' });
import { defineConfig, env } from 'prisma/config';
function databaseUrl() {
  try {
    return `mysql://${env('MYSQL_USER')}:${env('MYSQL_PASSWORD')}@${env('MYSQL_HOST')}:${env(
      'MYSQL_PORT'
    )}/${env('MYSQL_COMMENTS_DATABASE')}`;
  } catch (e) {
    console.error('Error constructing database URL:', e);
    return '';
  }
}

export default defineConfig({
  schema: 'prisma/comments/schema.prisma',
  migrations: {
    path: 'prisma/comments/migrations',
  },
  datasource: {
    url: databaseUrl(),
  },
});
