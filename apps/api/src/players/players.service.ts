import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  upsert(id: string, nickname: string) {
    return this.prisma.player.upsert({
      where: { id },
      create: { id, nickname },
      update: { nickname },
      select: { nickname: true, createdAt: true },
    });
  }
}
