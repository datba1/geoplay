import { Controller, Get, Query } from '@nestjs/common';
import { FactsService, Lang } from './facts.service';

const toLang = (l?: string): Lang => (l === 'vi' ? 'vi' : 'en');

@Controller('facts')
export class FactsController {
  constructor(private readonly facts: FactsService) {}

  @Get()
  list(@Query('lang') lang?: string) {
    return this.facts.list(toLang(lang));
  }

  @Get('today')
  today(@Query('lang') lang?: string) {
    return this.facts.today(toLang(lang));
  }
}
