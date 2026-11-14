import { BadRequestException, Injectable } from '@nestjs/common';
import { GAMES } from '../games/games.catalog';
import { dayKey, nextReset, seededRandom } from './day.util';

@Injectable()
export class DailyService {
  getChallenge(date?: string) {
    const key = date ?? dayKey();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new BadRequestException('date must be YYYY-MM-DD');
    const rand = seededRandom(`geoplay-${key}`);
    const pool = GAMES.filter((g) => g.implemented).map((g) => g.slug);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const games = pool.slice(0, 3).map((slug) => ({ slug, seed: Math.floor(rand() * 2 ** 31) }));
    return {
      date: key,
      games,
      resetsAt: key === dayKey() ? nextReset().toISOString() : null,
    };
  }
}
