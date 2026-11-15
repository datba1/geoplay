import { Controller, Get, Header, Query } from '@nestjs/common';
import { CACHE } from '../cache';
import { FactsService, Lang } from './facts.service';

const toLang = (l?: string): Lang => (l === 'vi' ? 'vi' : 'en');

@Controller('facts')
export class FactsController {
  constructor(private readonly facts: FactsService) {}

  @Get()
  @Header('Cache-Control', CACHE.long)
  list(@Query('lang') lang?: string) {
    return this.facts.list(toLang(lang));
  }

  @Get('today')
  @Header('Cache-Control', CACHE.medium)
  today(@Query('lang') lang?: string) {
    return this.facts.today(toLang(lang));
  }
}
