import { Controller, Get } from '@nestjs/common';
import { GAMES } from './games.catalog';

@Controller('games')
export class GamesController {
  @Get()
  list() {
    return GAMES;
  }
}
