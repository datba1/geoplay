import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    // Fallback matches docker-compose.yml so `npm install` works before .env exists.
    url: process.env.DATABASE_URL ?? 'postgresql://geoplay:geoplay@localhost:5432/geoplay?schema=public',
  },
});
