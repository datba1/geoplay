import { Controller, Get, Header } from '@nestjs/common';
import { CACHE } from '../cache';
import { GAMES } from './games.catalog';

@Controller('games')
export class GamesController {
  @Get()
  @Header('Cache-Control', CACHE.long)
  list() {
    return GAMES;
  }
}
