# GeoPlay

Geography mini-games about maps, flags and true sizes, inspired by *Kinh Vĩ*.
A monorepo with a **Next.js 15** frontend and a **NestJS 11** API backed by **PostgreSQL + Prisma 7**.

```
kinhvi/
├─ apps/
│  ├─ web/   Next.js (App Router, React 19) — UI, games, local progress, i18n EN/VI
│  └─ api/   NestJS — leaderboard, daily challenge, "did you know" facts
├─ docker-compose.yml   PostgreSQL 16
└─ package.json         npm workspaces + root scripts
```

## Requirements

- Node.js 20+ (22 recommended)
- Docker Desktop (for PostgreSQL), or any PostgreSQL 14+ you point `DATABASE_URL` at

## First run

```bash
npm install          # installs both apps, generates the Prisma client
npm run setup        # starts Postgres in Docker, applies migrations, seeds facts, loads World Bank data
npm run dev          # API on http://localhost:4000/api, web on http://localhost:3000
```

Run the apps separately with `npm run dev:api` and `npm run dev:web`.

Config lives in `apps/api/.env` and `apps/web/.env.local`; `npm install` creates them from the `.env.example` files if they are missing.
If you change the web port or domain, add it to `CORS_ORIGINS` in `apps/api/.env`.

## What's included

**Platform**
- Home page with a rotating dotted globe (drag to spin), XP bar, daily challenge, flip cards, collection summary and game catalogue
- Daily challenge: the API picks 3 games and seeds per day (same for everyone, resets at midnight UTC+7). Finishing all 3 gives +50 XP and a streak day
- Progress (XP, levels/tiers, passport stamps, 13 badges, per-game bests) is stored in `localStorage`; no account needed
- Nickname-only online leaderboard: overall or per game, all-time / this week / today
- English and Vietnamese UI (`apps/web/src/lib/i18n.tsx`)

**Games** (16, all in `apps/web/src/games/`)

| Category | Game | How it works |
|---|---|---|
| Maps | True Size | Equal-area shapes at one scale; drag/rotate into a frame country, fill % by canvas rasterisation |
| Maps | Border Sketch | Draw a country from memory; area-normalised IoU against the real outline |
| Maps | Warped Map | Non-contiguous cartogram of a hidden World Bank statistic; guess it |
| Maps | Globe Cut | Two taps on an orthographic globe define a great-circle cut; it must cross exactly the listed countries |
| Maps | Shadow Hunt | Find the country matching a silhouette on a spinnable globe |
| Maps | Sunset Chase | Real-time flight inside the sunset band (solar declination + hour angle, seeded date) |
| Maps | Quake Hunt | Distance rings (±8%) from seismometers; locate the epicentre, extra stations cost points |
| Maps | Nation Scales | Balance a big country with small ones by area, population or GDP; 3 test weighs |
| Flags | Flag Fault | One part of a real flag SVG is recoloured or removed; tap it |
| Flags | Flag Painter | Repaint each visible flag area choosing among five near-identical shades |
| Flags | Flag Mashup | Name the 2–3 flags stitched into one |
| Strategy | Border Chess | King/rook/knight on Europe's border graph vs. a one-ply AI |
| Strategy | Border Go | Go capture rules on Africa's border graph; countries worth 1–5 by area |
| Strategy | Diplomacy Duel | Annex neighbours in Asia by winning stat duels (area, borders, population, GDP, forest) |
| Strategy | New World | Procedural hex continent, 30 years vs. three kingdoms; empire shape matched to a real country |
| Nature | Elements | Crafting tree from Earth, Water, Fire, Wind, Time; creations stamp real places |

Shared pieces: `lib/regions.ts` (border graph per region, including a few sea straits), `components/RegionMap.tsx`,
`components/InteractiveGlobe.tsx`, `lib/flagsvg.ts`, and `lib/gameText.ts` for each game's EN/VI strings.

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | DB health check |
| GET | `/api/games` | Game catalogue |
| GET | `/api/daily?date=YYYY-MM-DD` | Daily set `{ date, games: [{slug, seed}], resetsAt }` |
| GET | `/api/facts?lang=en\|vi` | All fact cards |
| GET | `/api/facts/today?lang=` | Today's card |
| PUT | `/api/players/:uuid` | `{ nickname }` set nickname |
| POST | `/api/scores` | `{ playerId, nickname, gameSlug, points, daily?, meta? }` |
| GET | `/api/stats` | Latest World Bank value per country for 10 indicators (cached 10 min) |
| GET | `/api/leaderboard?game=&period=all\|week\|day&limit=&playerId=` | Ranked entries plus your own rank |

Scores are validated (known game, max points per game, rate limited). Daily scores keep the best per player/game/day.

## World Bank data

`npm run data:worldbank` downloads the latest value (2012 onwards) for every country and indicator listed in
`apps/api/src/stats/indicators.ts` and stores it in the `CountryStat` table. Re-run it whenever you want fresher
figures or after adding an indicator. Data: [World Bank Open Data](https://data.worldbank.org) (CC BY 4.0).

## Database

Prisma schema: `apps/api/prisma/schema.prisma` (Player, Score, Fact, CountryStat).

```bash
cd apps/api
npx prisma migrate dev --name my_change   # after editing the schema
npx prisma studio                          # browse data
npm run prisma:seed                        # re-seed facts
```

The project uses Prisma 7's engine-free client with the `pg` driver adapter (`src/prisma/prisma.service.ts`);
the generated client goes to `apps/api/src/generated/prisma` (git-ignored, recreated by `npm install`).

## Adding a game

1. Add it to `GAMES` in `apps/api/src/games/games.catalog.ts` (with `maxPoints`, `implemented: true`).
2. Add it to `apps/web/src/lib/games.ts` and its strings to `lib/gameText.ts` (`game.<slug>.name/kind/desc/tip`, rules), or register them from the game file with `addGameText()`.
3. Create `apps/web/src/games/MyGame.tsx` that receives `ctx: GameContext` and calls
   `ctx.finish({ points, stamps }, { score })` once, plus a `MyGamePage` wrapper like the existing games.
4. Add `apps/web/src/app/games/<slug>/page.tsx`.

## Deploy to Vercel

The repo deploys as **two Vercel projects** from the same Git repository, plus a hosted Postgres.

**1. Push to GitHub** (from the repo root):
```powershell
git init
git add .
git commit -m "GeoPlay"
git branch -M main
git remote add origin https://github.com/<you>/geoplay.git
git push -u origin main
```

**2. API project** — vercel.com/new → import the repo → *Root Directory* `apps/api`. Vercel detects NestJS
(entry `src/main.ts`) and runs it as one Vercel Function.
- *Storage* tab → add **Neon** (or **Prisma Postgres**) from the Marketplace and connect it: this sets `DATABASE_URL`.
- *Settings → Environment Variables*: `CORS_ORIGINS` = your web URL (add it after step 3, then redeploy).
- Check `https://<api-project>.vercel.app/api/health` returns `{"ok":true}`.

**3. Web project** — import the same repo again → *Root Directory* `apps/web` (Next.js is detected).
- Environment variable `NEXT_PUBLIC_API_URL` = `https://<api-project>.vercel.app/api`, then deploy.

**4. Create tables and load data** (once, from your machine, pointing at the cloud database). Use the
*direct* (non-pooled) connection string for migrations — with Neon that is `DATABASE_URL_UNPOOLED`:
```powershell
cd apps\api
$env:DATABASE_URL = "postgresql://...unpooled connection string..."
npx prisma migrate deploy
npx prisma db seed
npm run data:worldbank
Remove-Item Env:DATABASE_URL
```
Re-run `npx prisma migrate deploy` the same way whenever you add a migration.

## Data & credits

World Bank Open Data, Natural Earth 1:110m via [world-atlas](https://github.com/topojson/world-atlas), [flag-icons](https://github.com/lipis/flag-icons) (MIT), [d3-geo](https://d3js.org/d3-geo),
[i18n-iso-countries](https://github.com/michaelwittig/node-i18n-iso-countries). Areas are computed from simplified shapes and are approximate.
