import { Injectable, NotFoundException } from '@nestjs/common';
import type { Fact } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { dayKey } from '../daily/day.util';

export type Lang = 'en' | 'vi';

@Injectable()
export class FactsService {
  constructor(private readonly prisma: PrismaService) {}

  private localize(f: Fact, lang: Lang) {
    const vi = lang === 'vi';
    return {
      id: f.id,
      category: f.category,
      question: vi ? f.questionVi : f.questionEn,
      answer: vi ? f.answerVi : f.answerEn,
      detail: vi ? f.detailVi : f.detailEn,
      source: f.source,
    };
  }

  async list(lang: Lang) {
    const facts = await this.prisma.fact.findMany({ orderBy: { id: 'asc' } });
    return facts.map((f) => this.localize(f, lang));
  }

  /** One card per day, rotating through all facts. */
  async today(lang: Lang) {
    const facts = await this.prisma.fact.findMany({ orderBy: { id: 'asc' } });
    if (!facts.length) throw new NotFoundException('No facts seeded yet');
    const dayNumber = Math.floor(Date.parse(dayKey()) / 86_400_000);
    const index = dayNumber % facts.length;
    return { index, total: facts.length, fact: this.localize(facts[index], lang) };
  }
}
