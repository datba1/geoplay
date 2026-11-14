import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardQueryDto, SubmitScoreDto } from './leaderboard.dto';

@Controller()
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Post('scores')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  submit(@Body() dto: SubmitScoreDto) {
    return this.leaderboard.submit(dto);
  }

  @Get('leaderboard')
  board(@Query() q: LeaderboardQueryDto) {
    return this.leaderboard.board(q);
  }
}
