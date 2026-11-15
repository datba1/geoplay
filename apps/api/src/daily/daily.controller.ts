import { Controller, Get, Header, Query } from '@nestjs/common';
import { CACHE } from '../cache';
import { DailyService } from './daily.service';

@Controller('daily')
export class DailyController {
  constructor(private readonly daily: DailyService) {}

  @Get()
  @Header('Cache-Control', CACHE.medium)
  get(@Query('date') date?: string) {
    return this.daily.getChallenge(date);
  }
}
