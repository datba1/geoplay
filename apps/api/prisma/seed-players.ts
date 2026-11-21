/**
 * Seeds demo players and scores so the leaderboard is not empty on a fresh site.
 *   npm run db:seed-players     add (or refresh) the demo players
 *   npm run db:unseed-players   remove every demo player and their scores
 * Players are marked `seeded = true` in the database; that flag is never shown on the site.
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { GAMES } from '../src/games/games.catalog';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const NICKNAMES = [
  'minhkhoa.geo', 'LanAnh_2k', 'bao_lu_hanh', 'Cú Đêm', 'hat.tieu', 'mapnerd88', 'Thỏ Ngọc', 'duongbien',
  'trang.ph', 'NamPhong', 'sora.k', 'northstar', 'terra_nova', 'kiwi_maps', 'Lemur', 'quynh.nhu',
  'Sói Bạc', 'hoang.vu', 'Mèo Mù Bản Đồ', 'tuanbui.dev', 'linh_chi', 'Gấu Trúc', 'compass_rose', 'ha.my',
  'vietkid', 'Đại Bàng', 'khanh.ly', 'paper_plane', 'Bồ Câu', 'phuoc.an', 'riverbend', 'Cá Heo',
  'thanh.tam', 'zen_traveler', 'Sóc Nâu', 'longitude0', 'mai.anh', 'Hải Âu', 'ducmanh99', 'globe.trot',
];

/** Small deterministic PRNG so every run makes the same players. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

async function unseed() {
  const { count } = await prisma.player.deleteMany({ where: { seeded: true } });
  console.log(`Removed ${count} demo players (their scores were removed with them).`);
}

async function seed() {
  await unseed(); // refresh: start from a clean set
  const rand = rng(20261121);
  const games = GAMES.filter((g) => g.implemented);
  const now = Date.now();
  let scoreCount = 0;

  for (const [i, nickname] of NICKNAMES.entries()) {
    // A few strong players, a broad middle and a long tail of casual ones.
    const skill = i < 3 ? 0.82 + rand() * 0.1 : i < 12 ? 0.6 + rand() * 0.2 : 0.3 + rand() * 0.35;
    const played = games.filter(() => rand() < (i < 12 ? 0.75 : 0.35));
    if (!played.length) played.push(games[Math.floor(rand() * games.length)]);
    const joined = new Date(now - (5 + rand() * 40) * 86_400_000);
    const id = randomUUID();
    await prisma.player.create({ data: { id, nickname, seeded: true, createdAt: joined } });

    const rows = played.flatMap((g) => {
      const plays = 1 + Math.floor(rand() * 4);
      return Array.from({ length: plays }, () => {
        const points = Math.max(0, Math.min(g.maxPoints, Math.round(g.maxPoints * skill * (0.6 + rand() * 0.45))));
        const daysAgo = rand() * Math.min(30, (now - joined.getTime()) / 86_400_000);
        return { playerId: id, gameSlug: g.slug, points, createdAt: new Date(now - daysAgo * 86_400_000), meta: { seeded: true } };
      });
    });
    await prisma.score.createMany({ data: rows });
    scoreCount += rows.length;
  }
  console.log(`Seeded ${NICKNAMES.length} demo players with ${scoreCount} scores.`);
}

(process.argv.includes('--remove') ? unseed() : seed())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
