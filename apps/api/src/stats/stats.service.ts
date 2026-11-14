import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { INDICATORS } from './indicators';

export interface StatsPayload {
  indicators: {
    slug: string;
    group: string;
    unit: string;
    name: { en: string; vi: string };
    years: [number, number];
    values: Record<string, number>;
  }[];
}

@Injectable()
export class StatsService {
  private cache: { at: number; data: StatsPayload } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async all(): Promise<StatsPayload> {
    if (this.cache && Date.now() - this.cache.at < 10 * 60_000) return this.cache.data;
    const rows = await this.prisma.countryStat.findMany();
    if (!rows.length) {
      throw new ServiceUnavailableException('No country statistics yet. Run `npm run data:worldbank`.');
    }
    const data: StatsPayload = {
      indicators: INDICATORS.map((ind) => {
        const own = rows.filter((r) => r.indicator === ind.slug);
        const years = own.map((r) => r.year);
        return {
          slug: ind.slug,
          group: ind.group,
          unit: ind.unit,
          name: ind.name,
          years: [Math.min(...years), Math.max(...years)] as [number, number],
          values: Object.fromEntries(own.map((r) => [r.iso2, r.value])),
        };
      }).filter((i) => Object.keys(i.values).length > 20),
    };
    this.cache = { at: Date.now(), data };
    return data;
  }
}
