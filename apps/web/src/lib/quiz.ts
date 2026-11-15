import type { StatIndicator } from './api';
import { countryName } from './geo';
import { PASSPORT_COUNTRIES } from './continents';
import { mulberry32, shuffle } from './rng';

type Lang = 'en' | 'vi';

export interface QuizQuestion {
  id: string;
  tone: 'general' | 'fun' | 'surprise';
  question: string;
  options: string[];
  answer: number;
  /** Shown after answering: the real numbers. */
  explain: string;
}

/** Same set for everyone during one clock hour (UTC). */
export const hourKey = (now = Date.now()) => Math.floor(now / 3_600_000);

const fmt = (n: number, lang: Lang) => new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 1 }).format(n);
const people = (n: number, lang: Lang) =>
  n >= 1e9 ? `${fmt(n / 1e9, lang)} ${lang === 'vi' ? 'tỷ' : 'billion'}` : n >= 1e6 ? `${fmt(n / 1e6, lang)} ${lang === 'vi' ? 'triệu' : 'million'}` : fmt(Math.round(n), lang);
const usd = (n: number, lang: Lang) => `$${fmt(Math.round(n), lang)}`;

export function buildQuiz(indicators: StatIndicator[], areas: Map<string, number>, lang: Lang, key = hourKey()): QuizQuestion[] {
  const rand = mulberry32(key * 2654435761);
  const ind = (slug: string) => indicators.find((i) => i.slug === slug)?.values ?? {};
  const pop = ind('population');
  const urban = ind('urban');
  const internet = ind('internet');
  const gdp = ind('gdp');
  const name = (a2: string) => countryName(a2, lang);
  const vi = lang === 'vi';

  // Countries most players will have heard of: real states with at least a million people.
  const pool = Object.keys(pop).filter((a2) => PASSPORT_COUNTRIES.has(a2) && pop[a2] >= 1e6);
  const pick = () => pool[Math.floor(rand() * pool.length)];

  /** Find a pair satisfying `ok`, trying a bounded number of random draws. */
  const pair = (ok: (a: string, b: string) => boolean): [string, string] | null => {
    for (let i = 0; i < 400; i++) {
      const a = pick();
      const b = pick();
      if (a !== b && ok(a, b)) return [a, b];
    }
    return null;
  };
  const two = (a: string, b: string) => (rand() < 0.5 ? [a, b] : [b, a]);

  const makers: (() => QuizQuestion | null)[] = [
    // Which has more people?
    () => {
      const p = pair((a, b) => pop[a] / pop[b] > 1.15 && pop[a] / pop[b] < 3);
      if (!p) return null;
      const [winner, loser] = p;
      const options = two(winner, loser);
      return {
        id: 'pop', tone: 'general',
        question: vi ? `Nước nào đông dân hơn: ${name(options[0])} hay ${name(options[1])}?` : `Which has more people: ${name(options[0])} or ${name(options[1])}?`,
        options: options.map(name), answer: options.indexOf(winner),
        explain: `${name(winner)}: ${people(pop[winner], lang)} · ${name(loser)}: ${people(pop[loser], lang)}`,
      };
    },
    // Bigger country, fewer people.
    () => {
      const p = pair((big, small) => !!areas.get(big) && !!areas.get(small) && areas.get(big)! / areas.get(small)! > 2 && pop[big] < pop[small]);
      if (!p) return null;
      const [big, small] = p;
      const ratio = areas.get(big)! / areas.get(small)!;
      const options = two(big, small);
      return {
        id: 'area-pop', tone: 'surprise',
        question: vi
          ? `${name(big)} rộng gấp khoảng ${fmt(ratio, lang)} lần ${name(small)}. Nước nào đông dân hơn?`
          : `${name(big)} is about ${fmt(ratio, lang)} times bigger than ${name(small)}. Which has more people?`,
        options: options.map(name), answer: options.indexOf(small),
        explain: `${name(small)}: ${people(pop[small], lang)} · ${name(big)}: ${people(pop[big], lang)}`,
      };
    },
    // Guess the urban share.
    () => {
      const ok = pool.filter((a2) => urban[a2] && pop[a2]);
      if (!ok.length) return null;
      const a2 = ok[Math.floor(rand() * ok.length)];
      const share = Math.round((urban[a2] / pop[a2]) * 100);
      const rounded = Math.round(share / 5) * 5;
      const distractors = shuffle([-40, -25, 25, 40].map((d) => rounded + d).filter((v) => v >= 5 && v <= 95), rand).slice(0, 2);
      const options = shuffle([rounded, ...distractors], rand);
      return {
        id: 'urban', tone: 'fun',
        question: vi ? `Đoán xem: khoảng bao nhiêu phần trăm người dân ${name(a2)} sống ở thành thị?` : `Guess: roughly what share of people in ${name(a2)} live in cities?`,
        options: options.map((v) => `${v}%`), answer: options.indexOf(rounded),
        explain: vi ? `${name(a2)}: ${share}% dân số sống ở thành thị` : `${name(a2)}: ${share}% of people live in cities`,
      };
    },
    // Share of people online.
    () => {
      const share = (a2: string) => (internet[a2] ?? 0) / pop[a2];
      const p = pair((a, b) => !!internet[a] && !!internet[b] && share(a) - share(b) > 0.12);
      if (!p) return null;
      const [winner, loser] = p;
      const options = two(winner, loser);
      return {
        id: 'internet', tone: 'general',
        question: vi
          ? `Ở đâu tỷ lệ người dùng Internet cao hơn: ${name(options[0])} hay ${name(options[1])}?`
          : `Where is a bigger share of people online: ${name(options[0])} or ${name(options[1])}?`,
        options: options.map(name), answer: options.indexOf(winner),
        explain: `${name(winner)}: ${Math.round(share(winner) * 100)}% · ${name(loser)}: ${Math.round(share(loser) * 100)}%`,
      };
    },
    // Richer per person despite being smaller.
    () => {
      const perHead = (a2: string) => (gdp[a2] ?? 0) / pop[a2];
      const p = pair((rich, poor) => !!gdp[rich] && !!gdp[poor] && perHead(rich) > perHead(poor) * 1.5 && pop[rich] < pop[poor]);
      if (!p) return null;
      const [rich, poor] = p;
      const options = two(rich, poor);
      return {
        id: 'gdp-head', tone: 'surprise',
        question: vi
          ? `${name(poor)} đông dân hơn ${name(rich)}. Nước nào có GDP bình quân đầu người cao hơn?`
          : `${name(poor)} has more people than ${name(rich)}. Which produces more per person?`,
        options: options.map(name), answer: options.indexOf(rich),
        explain: vi
          ? `GDP/người: ${name(rich)} ${usd(perHead(rich), lang)} · ${name(poor)} ${usd(perHead(poor), lang)}`
          : `GDP per person: ${name(rich)} ${usd(perHead(rich), lang)} · ${name(poor)} ${usd(perHead(poor), lang)}`,
      };
    },
  ];

  const out: QuizQuestion[] = [];
  for (const make of shuffle(makers, rand)) {
    const q = make();
    if (q) out.push({ ...q, id: `${key}-${q.id}` });
    if (out.length === 3) break;
  }
  return out;
}
