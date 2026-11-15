'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { addGameText } from '@/lib/gameText';
import { cachedApi } from '@/lib/api';
import { countryName, flagUrl, formatKm2, loadWorld } from '@/lib/geo';
import { PASSPORT_COUNTRIES } from '@/lib/continents';
import { mulberry32, shuffle } from '@/lib/rng';
import { GameShell, type GameContext } from '@/components/GameShell';

addGameText({
  en: {
    'hl.q.area': 'Which country is bigger?', 'hl.q.population': 'Which country has more people?',
    'hl.q.density': 'Which country is more crowded (people per km²)?', 'hl.q.urban': 'Where does a bigger share of people live in cities?',
    'hl.q.gdpHead': 'Which country produces more per person?', 'hl.round': 'Round', 'hl.right': 'Correct!', 'hl.wrong': 'Not this time.',
    'hl.perKm': '{n} per km²', 'hl.share': '{n}% in cities', 'hl.head': '${n} per person', 'hl.ratio': '{ratio}× apart',
  },
  vi: {
    'hl.q.area': 'Nước nào rộng hơn?', 'hl.q.population': 'Nước nào đông dân hơn?',
    'hl.q.density': 'Nước nào đông đúc hơn (người/km²)?', 'hl.q.urban': 'Ở đâu tỷ lệ dân sống ở thành thị cao hơn?',
    'hl.q.gdpHead': 'Nước nào có GDP bình quân đầu người cao hơn?', 'hl.round': 'Câu', 'hl.right': 'Chính xác!', 'hl.wrong': 'Chưa đúng.',
    'hl.perKm': '{n} người/km²', 'hl.share': '{n}% ở thành thị', 'hl.head': '${n}/người', 'hl.ratio': 'chênh {ratio} lần',
  },
});

const ROUNDS = 10;
type Stat = 'area' | 'population' | 'density' | 'urban' | 'gdpHead';
interface Round { stat: Stat; a: string; b: string }

export function HigherLower({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  // How far apart the two values are: Easy pairs are obvious, Hard pairs are close calls.
  const GAP = ctx.pick<[number, number]>([2.5, 40], [1.35, 4], [1.06, 1.45]);
  const MIN_POP = ctx.pick(15e6, 2e6, 3e5);
  const [values, setValues] = useState<Partial<Record<Stat, Record<string, number>>> | null>(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [stamps, setStamps] = useState<string[]>([]);

  useEffect(() => {
    loadWorld().then(async (w) => {
      const area = Object.fromEntries(w.countries.map((c) => [c.a2, c.areaKm2]));
      const out: Partial<Record<Stat, Record<string, number>>> = { area };
      try {
        const s = await cachedApi.stats();
        const ind = (slug: string) => s.indicators.find((i) => i.slug === slug)?.values;
        const pop = ind('population');
        const urban = ind('urban');
        const gdp = ind('gdp');
        if (pop) {
          out.population = pop;
          out.density = Object.fromEntries(Object.keys(pop).filter((k) => area[k]).map((k) => [k, pop[k] / area[k]]));
          if (urban) out.urban = Object.fromEntries(Object.keys(pop).filter((k) => urban[k]).map((k) => [k, (urban[k] / pop[k]) * 100]));
          if (gdp) out.gdpHead = Object.fromEntries(Object.keys(pop).filter((k) => gdp[k]).map((k) => [k, gdp[k] / pop[k]]));
        }
      } catch {}
      setValues(out);
    });
  }, []);

  const rounds = useMemo<Round[]>(() => {
    if (!values) return [];
    const rand = mulberry32(ctx.seed);
    const pop = values.population;
    const stats = (Object.keys(values) as Stat[]).filter((k) => values[k]);
    const out: Round[] = [];
    // Strict pass first (no country twice, gap in range); later passes relax so a run always has 10 rounds.
    for (const [strict, slack] of [[true, 1], [false, 1], [false, 0.7]] as const) {
      let guard = 0;
      while (out.length < ROUNDS && guard++ < 3000) {
        const stat = stats[out.length % stats.length];
        const v = values[stat]!;
        const pool = Object.keys(v).filter((c) => PASSPORT_COUNTRIES.has(c) && (!pop || (pop[c] ?? 0) >= MIN_POP * slack));
        const [a, b] = shuffle(pool, rand);
        if (!a || !b) continue;
        const ratio = Math.max(v[a], v[b]) / Math.min(v[a], v[b]);
        if (ratio < GAP[0] * (slack < 1 ? 0.97 : 1) || ratio > GAP[1] / slack) continue;
        if (strict && out.some((r) => [r.a, r.b].includes(a) || [r.a, r.b].includes(b))) continue;
        if (out.some((r) => r.stat === stat && ((r.a === a && r.b === b) || (r.a === b && r.b === a)))) continue;
        out.push({ stat, a, b });
      }
    }
    return shuffle(out, rand);
  }, [values, ctx.seed, ctx.difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  const r = rounds[idx];

  const fmt = (stat: Stat, x: number) => {
    const nf = (n: number, d = 0) => new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: d, notation: n >= 1e6 ? 'compact' : 'standard' }).format(n);
    if (stat === 'area') return formatKm2(x, lang);
    if (stat === 'population') return nf(x, 1);
    if (stat === 'density') return t('hl.perKm', { n: nf(x) });
    if (stat === 'urban') return t('hl.share', { n: Math.round(x) });
    return t('hl.head', { n: nf(x) });
  };

  const choose = (c: string) => {
    if (picked || !r || !values) return;
    const v = values[r.stat]!;
    const winner = v[r.a] >= v[r.b] ? r.a : r.b;
    setPicked(c);
    ctx.hit(c === winner);
    if (c === winner) {
      setScore((s) => s + 100);
      setStamps((s) => [...s, c]);
    }
  };

  const next = () => {
    if (idx + 1 >= rounds.length) {
      ctx.finish({ points: score, stamps, meta: { right: stamps.length } }, { score: String(score), subtitle: `${stamps.length} / ${rounds.length}` });
      return;
    }
    setIdx((i) => i + 1);
    setPicked(null);
  };

  if (!values || !r) return <div className="card muted">{t('common.loading')}</div>;
  const v = values[r.stat]!;
  const winner = v[r.a] >= v[r.b] ? r.a : r.b;
  const ratio = Math.max(v[r.a], v[r.b]) / Math.min(v[r.a], v[r.b]);

  return (
    <div className="game-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) 260px' }}>
      <div className="card">
        <h2 style={{ fontSize: 26, margin: '0 0 16px', textAlign: 'center' }}>{t(`hl.q.${r.stat}`)}</h2>
        <div className="versus">
          {[r.a, r.b].map((c, i) => (
            <button
              key={c}
              className={`versus-card ${picked ? (c === winner ? 'right' : c === picked ? 'wrong' : 'dim') : ''}`}
              disabled={!!picked}
              onClick={() => choose(c)}
            >
              <img src={flagUrl(c)} alt="" />
              <b>{countryName(c, lang)}</b>
              <span className={picked ? 'value shown' : 'value'}>{picked ? fmt(r.stat, v[c]) : '?'}</span>
              {i === 0 && <span className="vs" aria-hidden>VS</span>}
            </button>
          ))}
        </div>
        {picked && (
          <div className="row" style={{ justifyContent: 'center', marginTop: 16, gap: 12, flexWrap: 'wrap' }}>
            <b className={picked === winner ? 'pill-good' : 'pill-bad'}>{picked === winner ? t('hl.right') : t('hl.wrong')}</b>
            <span className="muted small">{t('hl.ratio', { ratio: ratio.toFixed(ratio < 2 ? 2 : 1) })}</span>
            <button className="btn btn-primary btn-sm" onClick={next}>{t('common.next')} →</button>
          </div>
        )}
      </div>
      <aside className="side">
        <div className="row">
          <div className="stat-box" style={{ flex: 1 }}><small>{t('hl.round')}</small><b>{idx + 1} / {rounds.length}</b></div>
          <div className="stat-box" style={{ flex: 1 }}><small>{t('common.score')}</small><b>{score}</b></div>
        </div>
      </aside>
    </div>
  );
}

export function HigherLowerPage() {
  return (
    <GameShell slug="higher-lower" rules={['hl.rules.1', 'hl.rules.2', 'hl.rules.3']}>
      {(ctx) => <HigherLower key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
