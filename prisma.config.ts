import { config } from 'dotenv';
// Load from alea-frontend .env.local so Prisma CLI picks up COMMENTS_DATABASE_URL
config({ path: 'packages/alea-frontend/.env.local' });
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/comments/schema.prisma',
  migrations: {
    path: 'prisma/comments/migrations',
  },
  datasource: {
   url: `mysql://${env('MYSQL_USER')}:${env('MYSQL_PASSWORD')}@${env('MYSQL_HOST')}:${env('MYSQL_PORT')}/${env('MYSQL_COMMENTS_DATABASE')}`,
  },
});
