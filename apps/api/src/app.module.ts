import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { GamesModule } from './games/games.module';
import { DailyModule } from './daily/daily.module';
import { FactsModule } from './facts/facts.module';
import { PlayersModule } from './players/players.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { StatsModule } from './stats/stats.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    GamesModule,
    DailyModule,
    FactsModule,
    PlayersModule,
    LeaderboardModule,
    StatsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
