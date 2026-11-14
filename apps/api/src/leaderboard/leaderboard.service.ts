import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { findGame } from '../games/games.catalog';
import { dayKey } from '../daily/day.util';
import { LeaderboardQueryDto, SubmitScoreDto } from './leaderboard.dto';

interface Row {
  id: string;
  nickname: string;
  points: bigint | number;
  rank: bigint | number;
}

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(dto: SubmitScoreDto) {
    const game = findGame(dto.gameSlug);
    if (!game || !game.implemented) throw new BadRequestException('Unknown game');
    if (dto.points > game.maxPoints) throw new BadRequestException('Score out of range');

    await this.prisma.player.upsert({
      where: { id: dto.playerId },
      create: { id: dto.playerId, nickname: dto.nickname },
      update: { nickname: dto.nickname },
    });

    const today = dto.daily ? dayKey() : null;
    if (today) {
      // One daily entry per player, game and day: keep the best.
      const existing = await this.prisma.score.findFirst({
        where: { playerId: dto.playerId, gameSlug: game.slug, dayKey: today },
      });
      if (existing) {
        if (existing.points >= dto.points) return { saved: false, best: existing.points };
        await this.prisma.score.update({
          where: { id: existing.id },
          data: { points: dto.points, meta: dto.meta as Prisma.InputJsonValue },
        });
        return { saved: true, best: dto.points };
      }
    }

    await this.prisma.score.create({
      data: {
        playerId: dto.playerId,
        gameSlug: game.slug,
        points: dto.points,
        dayKey: today,
        meta: dto.meta as Prisma.InputJsonValue | undefined,
      },
    });
    return { saved: true, best: dto.points };
  }

  async board(q: LeaderboardQueryDto) {
    if (q.game && !findGame(q.game)) throw new BadRequestException('Unknown game');

    let filter = Prisma.sql`TRUE`;
    if (q.period === 'day') filter = Prisma.sql`s."dayKey" = ${dayKey()}`;
    if (q.period === 'week') {
      filter = Prisma.sql`s."createdAt" >= ${new Date(Date.now() - 7 * 86_400_000)}`;
    }
    const gameFilter = q.game ? Prisma.sql`AND s."gameSlug" = ${q.game}` : Prisma.empty;

    // Per player: best score for each game, then summed (only one game when filtered).
    const rows = await this.prisma.$queryRaw<Row[]>`
      WITH best AS (
        SELECT s."playerId", s."gameSlug", MAX(s.points) AS best
        FROM "Score" s
        WHERE ${filter} ${gameFilter}
        GROUP BY s."playerId", s."gameSlug"
      ), totals AS (
        SELECT p.id, p.nickname, SUM(b.best) AS points,
               RANK() OVER (ORDER BY SUM(b.best) DESC) AS rank
        FROM best b JOIN "Player" p ON p.id = b."playerId"
        GROUP BY p.id, p.nickname
      )
      SELECT id, nickname, points, rank FROM totals
      WHERE rank <= ${q.limit} ${q.playerId ? Prisma.sql`OR id = ${q.playerId}::uuid` : Prisma.empty}
      ORDER BY rank ASC, nickname ASC
    `;

    const entries = rows.map((r) => ({
      rank: Number(r.rank),
      nickname: r.nickname,
      points: Number(r.points),
      isMe: q.playerId ? r.id === q.playerId : false,
    }));
    return {
      game: q.game ?? null,
      period: q.period,
      entries: entries.filter((e) => e.rank <= q.limit),
      me: entries.find((e) => e.isMe) ?? null,
    };
  }
}
