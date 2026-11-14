// Creates local env files from the examples if they don't exist yet.
// Skipped on Vercel/CI, where environment variables come from the project settings.
import { copyFileSync, existsSync } from 'node:fs';

if (process.env.VERCEL || process.env.CI) process.exit(0);

const pairs = [
  ['apps/api/.env.example', 'apps/api/.env'],
  ['apps/web/.env.example', 'apps/web/.env.local'],
];
for (const [src, dest] of pairs) {
  if (!existsSync(dest) && existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`Created ${dest}`);
  }
}
