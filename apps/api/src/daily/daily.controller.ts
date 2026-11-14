import { Controller, Get, Query } from '@nestjs/common';
import { DailyService } from './daily.service';

@Controller('daily')
export class DailyController {
  constructor(private readonly daily: DailyService) {}

  @Get()
  get(@Query('date') date?: string) {
    return this.daily.getChallenge(date);
  }
}
