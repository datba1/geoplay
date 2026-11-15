'use client';

import { useEffect, useMemo, useState } from 'react';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { useI18n } from '@/lib/i18n';
import { addGameText } from '@/lib/gameText';
import { countryName, flagUrl, loadWorld, type World } from '@/lib/geo';
import { CAPITALS, capitalName, type Capital } from '@/lib/capitals';
import { mulberry32, shuffle } from '@/lib/rng';
import { GameShell, type GameContext } from '@/components/GameShell';

addGameText({
  en: {
    'ns2.q.north': 'Which city is further north?', 'ns2.q.south': 'Which city is further south?',
    'ns2.q.east': 'Which city is further east?', 'ns2.q.west': 'Which city is further west?',
    'ns2.round': 'Round', 'ns2.right': 'Correct!', 'ns2.wrong': 'Not quite.', 'ns2.lat': '{n}° {h}', 'ns2.lon': '{n}° {h}',
  },
  vi: {
    'ns2.q.north': 'Thành phố nào nằm xa hơn về phía bắc?', 'ns2.q.south': 'Thành phố nào nằm xa hơn về phía nam?',
    'ns2.q.east': 'Thành phố nào nằm xa hơn về phía đông?', 'ns2.q.west': 'Thành phố nào nằm xa hơn về phía tây?',
    'ns2.round': 'Câu', 'ns2.right': 'Chính xác!', 'ns2.wrong': 'Chưa đúng.', 'ns2.lat': '{n}° {h}', 'ns2.lon': '{n}° {h}',
  },
});

const ROUNDS = 10;
const W = 640;
const H = 320;
type Dir = 'north' | 'south' | 'east' | 'west';
interface Round { dir: Dir; cities: Capital[] }

const coord = (c: Capital, dir: Dir) => (dir === 'north' || dir === 'south' ? c.lat : c.lon);
const best = (r: Round) =>
  [...r.cities].sort((a, b) => (r.dir === 'north' || r.dir === 'east' ? coord(b, r.dir) - coord(a, r.dir) : coord(a, r.dir) - coord(b, r.dir)))[0];

export function NorthSouth({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  // Easy: two cities far apart, always "north". Hard: three cities, close together, any direction.
  const DIRS = ctx.pick<Dir[]>(['north'], ['north', 'south'], ['north', 'south', 'east', 'west']);
  const MIN_GAP = ctx.pick(12, 4, 1);
  const COUNT = ctx.pick(2, 2, 3);
  const [world, setWorld] = useState<World | null>(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [stamps, setStamps] = useState<string[]>([]);

  useEffect(() => { loadWorld().then(setWorld); }, []);

  const rounds = useMemo<Round[]>(() => {
    const rand = mulberry32(ctx.seed);
    const out: Round[] = [];
    let guard = 0;
    while (out.length < ROUNDS && guard++ < 5000) {
      const dir = DIRS[Math.floor(rand() * DIRS.length)];
      const cities = shuffle(CAPITALS, rand).slice(0, COUNT);
      const vals = cities.map((c) => coord(c, dir)).sort((a, b) => a - b);
      // Every pair must be at least MIN_GAP apart, and east/west stays within one hemisphere view.
      const gaps = vals.slice(1).map((v, i) => v - vals[i]);
      if (Math.min(...gaps) < MIN_GAP) continue;
      if ((dir === 'east' || dir === 'west') && vals[vals.length - 1] - vals[0] > 150) continue;
      out.push({ dir, cities });
    }
    return out;
  }, [ctx.seed, ctx.difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  const r = rounds[idx];
  const projection = useMemo(() => geoEquirectangular().fitExtent([[0, 0], [W, H]], { type: 'Sphere' }), []);
  const land = useMemo(() => (world ? geoPath(projection)(world.land) ?? '' : ''), [world, projection]);

  const choose = (c: Capital) => {
    if (picked || !r) return;
    const answer = best(r);
    setPicked(c.a2);
    ctx.hit(c.a2 === answer.a2);
    if (c.a2 === answer.a2) {
      setScore((s) => s + 100);
      setStamps((s) => [...s, c.a2]);
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

  if (!r) return <div className="card muted">{t('common.loading')}</div>;
  const answer = best(r);
  const fmtLat = (v: number) => t('ns2.lat', { n: Math.abs(v).toFixed(1), h: v >= 0 ? 'N' : 'S' });
  const fmtLon = (v: number) => t('ns2.lon', { n: Math.abs(v).toFixed(1), h: v >= 0 ? 'E' : 'W' });
  const vertical = r.dir === 'north' || r.dir === 'south';

  return (
    <div className="game-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) 260px' }}>
      <div className="card">
        <h2 style={{ fontSize: 26, margin: '0 0 16px', textAlign: 'center' }}>
          <span className={`dir-arrow dir-${r.dir}`} aria-hidden>➜</span> {t(`ns2.q.${r.dir}`)}
        </h2>
        <div className="city-options" style={{ gridTemplateColumns: `repeat(${r.cities.length}, 1fr)` }}>
          {r.cities.map((c) => (
            <button
              key={c.a2}
              className={`versus-card ${picked ? (c.a2 === answer.a2 ? 'right' : c.a2 === picked ? 'wrong' : 'dim') : ''}`}
              disabled={!!picked}
              onClick={() => choose(c)}
            >
              <img src={flagUrl(c.a2)} alt="" />
              <b>{capitalName(c, lang)}</b>
              <span className="muted small">{countryName(c.a2, lang)}</span>
              {picked && <span className="value shown">{vertical ? fmtLat(c.lat) : fmtLon(c.lon)}</span>}
            </button>
          ))}
        </div>
        {picked && (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} className="ns-map">
              <rect width={W} height={H} fill="#0c1430" rx="10" />
              <path d={land} fill="#25335a" />
              {r.cities.map((c) => {
                const [x, y] = projection([c.lon, c.lat]) ?? [0, 0];
                const on = c.a2 === answer.a2;
                return (
                  <g key={c.a2}>
                    {vertical
                      ? <line x1={0} x2={W} y1={y} y2={y} stroke={on ? '#4fd1a1' : '#8e96ab'} strokeDasharray="4 5" strokeWidth={1.2} />
                      : <line y1={0} y2={H} x1={x} x2={x} stroke={on ? '#4fd1a1' : '#8e96ab'} strokeDasharray="4 5" strokeWidth={1.2} />}
                    <circle cx={x} cy={y} r={5} fill={on ? '#4fd1a1' : '#fbbf24'} stroke="#0b1020" strokeWidth={1.5} />
                    <text x={x + 8} y={y - 8} fill="#ece8df" fontSize="13" fontWeight={600}>{capitalName(c, lang)}</text>
                  </g>
                );
              })}
            </svg>
            <div className="row" style={{ justifyContent: 'center', marginTop: 12, gap: 12 }}>
              <b className={picked === answer.a2 ? 'pill-good' : 'pill-bad'}>{picked === answer.a2 ? t('ns2.right') : t('ns2.wrong')}</b>
              <button className="btn btn-primary btn-sm" onClick={next}>{t('common.next')} →</button>
            </div>
          </>
        )}
      </div>
      <aside className="side">
        <div className="row">
          <div className="stat-box" style={{ flex: 1 }}><small>{t('ns2.round')}</small><b>{idx + 1} / {rounds.length}</b></div>
          <div className="stat-box" style={{ flex: 1 }}><small>{t('common.score')}</small><b>{score}</b></div>
        </div>
      </aside>
    </div>
  );
}

export function NorthSouthPage() {
  return (
    <GameShell slug="north-south" rules={['ns2.rules.1', 'ns2.rules.2', 'ns2.rules.3']}>
      {(ctx) => <NorthSouth key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
