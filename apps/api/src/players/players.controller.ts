import { Body, Controller, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { PlayersService } from './players.service';
import { UpdateNicknameDto } from './players.dto';

@Controller('players')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Put(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateNicknameDto) {
    return this.players.upsert(id, dto.nickname);
  }
}
