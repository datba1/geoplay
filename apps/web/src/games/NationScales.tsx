'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { addGameText } from '@/lib/gameText';
import { api } from '@/lib/api';
import { countryName, flagUrl, formatKm2, loadWorld, type World } from '@/lib/geo';
import { mulberry32, shuffle } from '@/lib/rng';
import { GameShell, type GameContext } from '@/components/GameShell';

addGameText({
  en: {
    'ns.balance': 'Balance by {stat}', 'ns.test': 'Test weigh ({n} left)', 'ns.commit': 'Commit', 'ns.heavier': 'Your side is heavier',
    'ns.lighter': 'Your side is lighter', 'ns.even': 'Almost perfectly balanced!', 'ns.off': 'Off by {pct}%', 'ns.tray': 'Tray: tap to load / unload',
    'ns.area': 'area', 'ns.population': 'population', 'ns.gdp': 'GDP', 'ns.target': 'Target', 'ns.yours': 'Your pan',
  },
  vi: {
    'ns.balance': 'Cân theo {stat}', 'ns.test': 'Cân thử (còn {n})', 'ns.commit': 'Chốt', 'ns.heavier': 'Đĩa của bạn nặng hơn',
    'ns.lighter': 'Đĩa của bạn nhẹ hơn', 'ns.even': 'Gần như cân bằng hoàn hảo!', 'ns.off': 'Lệch {pct}%', 'ns.tray': 'Khay: chạm để đặt / bỏ',
    'ns.area': 'diện tích', 'ns.population': 'dân số', 'ns.gdp': 'GDP', 'ns.target': 'Mục tiêu', 'ns.yours': 'Đĩa của bạn',
  },
});

const ROUNDS = 5;
const TESTS = 3;
type StatKey = 'area' | 'population' | 'gdp';
interface Round { stat: StatKey; big: string; tray: string[] }

export function NationScales({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  const [world, setWorld] = useState<World | null>(null);
  const [values, setValues] = useState<Partial<Record<StatKey, Record<string, number>>> | null>(null);
  const [idx, setIdx] = useState(0);
  const [load, setLoad] = useState<string[]>([]);
  const [tests, setTests] = useState(TESTS);
  const [tilt, setTilt] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const [stamps, setStamps] = useState<string[]>([]);

  useEffect(() => {
    loadWorld().then((w) => {
      setWorld(w);
      const area = Object.fromEntries(w.countries.map((c) => [c.a2, c.areaKm2]));
      api.stats()
        .then((s) => {
          const pick = (slug: string) => s.indicators.find((i) => i.slug === slug)?.values;
          setValues({ area, population: pick('population'), gdp: pick('gdp') });
        })
        .catch(() => setValues({ area }));
    });
  }, []);

  const rounds = useMemo<Round[]>(() => {
    if (!world || !values) return [];
    const rand = mulberry32(ctx.seed);
    const stats = (['area', 'population', 'gdp'] as StatKey[]).filter((k) => values[k]);
    const onMap = new Set(world.countries.map((c) => c.a2));
    const used = new Set<string>();
    return Array.from({ length: ROUNDS }, (_, i) => {
      const stat = stats[i % stats.length];
      const v = values[stat]!;
      const ranked = Object.entries(v).filter(([c]) => onMap.has(c)).sort((a, b) => b[1] - a[1]);
      const big = shuffle(ranked.slice(0, 20).filter(([c]) => !used.has(c)), rand)[0][0];
      used.add(big);
      const target = v[big];
      let small = ranked.filter(([c, x]) => c !== big && x > target * 0.03 && x < target * 0.55).map(([c]) => c);
      if (small.length < 6) small = ranked.filter(([c, x]) => c !== big && x < target).map(([c]) => c);
      return { stat, big, tray: shuffle(small, rand).slice(0, 10) };
    });
  }, [world, values, ctx.seed]);

  const round = rounds[idx];
  if (!round || !values) return <div className="card muted">{t('common.loading')}</div>;

  const v = values[round.stat]!;
  const target = v[round.big];
  const sum = load.reduce((s, c) => s + v[c], 0);
  const fmt = (x: number) =>
    round.stat === 'area' ? formatKm2(x, lang) : round.stat === 'gdp' ? `$${new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: 1 }).format(x)}`
      : new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: 1 }).format(x);
  const angleFor = (s: number) => Math.max(-14, Math.min(14, ((s - target) / target) * 18));

  const toggle = (c: string) => {
    if (done) return;
    setLoad((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));
    setTilt(null);
    setMessage(null);
  };

  const test = () => {
    if (!tests) return;
    setTests((n) => n - 1);
    setTilt(angleFor(sum));
    const off = Math.abs(sum - target) / target;
    setMessage(off < 0.03 ? t('ns.even') : sum > target ? t('ns.heavier') : t('ns.lighter'));
  };

  const commit = () => {
    const off = Math.abs(sum - target) / target;
    const pts = Math.round(200 * Math.max(0, 1 - off * 2));
    setScore((s) => s + pts);
    if (off < 0.15) setStamps((s) => [...s, round.big, ...load]);
    setTilt(angleFor(sum));
    setMessage(`${t('ns.off', { pct: Math.round(off * 100) })} · +${pts}`);
    setDone(true);
  };

  const next = () => {
    if (idx + 1 >= rounds.length) {
      ctx.finish({ points: score, stamps, meta: {} }, { score: String(score) });
      return;
    }
    setIdx((i) => i + 1);
    setLoad([]);
    setTests(TESTS);
    setTilt(null);
    setMessage(null);
    setDone(false);
  };

  const angle = tilt ?? 0;

  return (
    <div className="game-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) 300px' }}>
      <div className="card">
        <span className="eyebrow">{t('ns.balance', { stat: t(`ns.${round.stat}`) })}</span>
        <svg viewBox="0 0 600 300" style={{ width: '100%', display: 'block', marginTop: 8 }}>
          <path d="M300 280 L300 90 M250 280 L350 280" stroke="#8e96ab" strokeWidth={6} strokeLinecap="round" />
          <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '300px 90px', transition: 'transform 0.8s cubic-bezier(.2,.8,.2,1)' }}>
            <line x1={90} y1={90} x2={510} y2={90} stroke="#c9953f" strokeWidth={6} strokeLinecap="round" />
            <g transform="translate(110 90)" style={{ transform: `translate(110px,90px) rotate(${-angle}deg)`, transition: 'transform 0.8s' }}>
              <line x1={-50} y1={0} x2={0} y2={70} stroke="#8e96ab" /><line x1={50} y1={0} x2={0} y2={70} stroke="#8e96ab" />
              <ellipse cx={0} cy={78} rx={70} ry={12} fill="#2a3150" stroke="#8e96ab" />
              <image href={flagUrl(round.big)} x={-30} y={30} width={60} height={45} />
            </g>
            <g style={{ transform: `translate(490px,90px) rotate(${-angle}deg)`, transition: 'transform 0.8s' }}>
              <line x1={-50} y1={0} x2={0} y2={70} stroke="#8e96ab" /><line x1={50} y1={0} x2={0} y2={70} stroke="#8e96ab" />
              <ellipse cx={0} cy={78} rx={70} ry={12} fill="#2a3150" stroke="#8e96ab" />
              {load.slice(0, 8).map((c, i) => (
                <image key={c} href={flagUrl(c)} x={-56 + (i % 4) * 28} y={44 - Math.floor(i / 4) * 20} width={26} height={19} />
              ))}
            </g>
          </g>
          {tilt === null && !done && <text x={300} y={60} textAnchor="middle" fontSize={22} fill="rgba(255,255,255,0.4)">?</text>}
        </svg>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><span className="muted small">{t('ns.target')}</span><br /><b>{countryName(round.big, lang)}</b>{done && <span className="muted small"> · {fmt(target)}</span>}</div>
          <div style={{ textAlign: 'right' }}><span className="muted small">{t('ns.yours')}</span><br /><b>{load.length}</b>{done && <span className="muted small"> · {fmt(sum)}</span>}</div>
        </div>
        {message && <p style={{ textAlign: 'center', fontWeight: 600 }} className={done ? '' : 'accent-text'}>{message}</p>}
      </div>
      <aside className="side">
        <div className="row">
          <div className="stat-box" style={{ flex: 1 }}><small>{t('common.round')}</small><b>{idx + 1} / {rounds.length}</b></div>
          <div className="stat-box" style={{ flex: 1 }}><small>{t('common.score')}</small><b>{score}</b></div>
        </div>
        <span className="eyebrow">{t('ns.tray')}</span>
        <div className="tray" style={{ maxHeight: 'none' }}>
          {round.tray.map((c) => (
            <button key={c} className="tray-item" style={{ cursor: 'pointer', borderColor: load.includes(c) ? 'var(--accent)' : undefined, background: load.includes(c) ? 'rgba(255,122,80,0.12)' : undefined }} onClick={() => toggle(c)}>
              {countryName(c, lang)}
              {done && <small>{fmt(v[c])}</small>}
            </button>
          ))}
        </div>
        {done ? (
          <button className="btn btn-primary" onClick={next}>{t('common.next')} →</button>
        ) : (
          <div className="row">
            <button className="btn" style={{ flex: 1 }} disabled={!tests || !load.length} onClick={test}>{t('ns.test', { n: tests })}</button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={!load.length} onClick={commit}>{t('ns.commit')}</button>
          </div>
        )}
      </aside>
    </div>
  );
}

export function NationScalesPage() {
  return (
    <GameShell slug="nation-scales" rules={['ns.rules.1', 'ns.rules.2', 'ns.rules.3']}>
      {(ctx) => <NationScales key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
