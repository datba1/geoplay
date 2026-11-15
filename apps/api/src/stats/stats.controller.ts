import { Controller, Get, Header } from '@nestjs/common';
import { StatsService } from './stats.service';
import { CACHE } from '../cache';

@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  @Header('Cache-Control', CACHE.long)
  all() {
    return this.stats.all();
  }
}
