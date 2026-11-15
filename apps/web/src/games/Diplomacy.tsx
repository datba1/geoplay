'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { addGameText } from '@/lib/gameText';
import { cachedApi } from '@/lib/api';
import { countryName, flagUrl, formatKm2, loadWorld, type World } from '@/lib/geo';
import { REGIONS, regionGraph, bfs } from '@/lib/regions';
import { mulberry32 } from '@/lib/rng';
import { GameShell, type GameContext } from '@/components/GameShell';
import { RegionMap } from '@/components/RegionMap';

addGameText({
  en: {
    'dp.from': '1. Pick one of your countries', 'dp.target': '2. Pick an adjacent target', 'dp.stat': '3. Duel on which stat?',
    'dp.won': '{from} beat {to} on {stat}: annexed!', 'dp.lost': '{to} held against {from} on {stat}.', 'dp.turn': 'Turn',
    'dp.yours': 'Your empire', 'dp.rival': 'Rival', 'dp.ai': 'Rival is moving…', 'dp.area': 'Area', 'dp.population': 'Population', 'dp.gdp': 'GDP',
    'dp.forest': 'Forest', 'dp.borders': 'Borders', 'dp.vs': 'vs',
  },
  vi: {
    'dp.from': '1. Chọn một nước của bạn', 'dp.target': '2. Chọn mục tiêu kề bên', 'dp.stat': '3. So chỉ số nào?',
    'dp.won': '{from} thắng {to} về {stat}: sáp nhập!', 'dp.lost': '{to} giữ vững trước {from} về {stat}.', 'dp.turn': 'Lượt',
    'dp.yours': 'Đế chế của bạn', 'dp.rival': 'Đối thủ', 'dp.ai': 'Đối thủ đang đi…', 'dp.area': 'Diện tích', 'dp.population': 'Dân số', 'dp.gdp': 'GDP',
    'dp.forest': 'Rừng', 'dp.borders': 'Biên giới', 'dp.vs': 'đấu',
  },
});

type Owner = 'p' | 'a';
const TURNS = 12;
type StatKey = 'area' | 'population' | 'gdp' | 'forest' | 'borders';

export function Diplomacy({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  const AI_NOISE = ctx.pick(2, 0.1, 0.01);
  const [world, setWorld] = useState<World | null>(null);
  const [stats, setStats] = useState<Partial<Record<StatKey, Record<string, number>>>>({});
  const [owners, setOwners] = useState<Map<string, Owner>>(new Map());
  const [from, setFrom] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [turn, setTurn] = useState(1);
  const [who, setWho] = useState<Owner>('p');
  const [log, setLog] = useState<{ text: string; good: boolean }[]>([]);
  const [over, setOver] = useState(false);

  useEffect(() => {
    loadWorld().then(setWorld);
    cachedApi.stats().then((s) => {
      const pick = (slug: string) => s.indicators.find((i) => i.slug === slug)?.values;
      setStats({ population: pick('population'), gdp: pick('gdp'), forest: pick('forest') });
    }).catch(() => {});
  }, []);

  const graph = useMemo(() => (world ? regionGraph(world, REGIONS.asia) : new Map<string, string[]>()), [world]);
  const statKeys = useMemo<StatKey[]>(() => ['area', 'borders', ...(['population', 'gdp', 'forest'] as StatKey[]).filter((k) => stats[k])], [stats]);

  const value = (k: StatKey, a2: string): number => {
    if (k === 'area') return world!.byA2.get(a2)!.areaKm2;
    if (k === 'borders') return world!.neighbors.get(a2)?.size ?? 0;
    return stats[k]?.[a2] ?? 0;
  };
  const fmt = (k: StatKey, v: number) =>
    k === 'area' ? formatKm2(v, lang) : k === 'borders' ? String(v) : k === 'gdp' ? `$${new Intl.NumberFormat(lang, { notation: 'compact' }).format(v)}`
      : k === 'forest' ? formatKm2(v, lang) : new Intl.NumberFormat(lang, { notation: 'compact' }).format(v);

  // Starting capitals: seeded, far apart.
  useEffect(() => {
    if (!graph.size) return;
    const nodes = [...graph.keys()].filter((c) => (graph.get(c)?.length ?? 0) >= 2);
    const mine = nodes[Math.floor(mulberry32(ctx.seed)() * nodes.length)];
    const d = bfs(graph, mine);
    const theirs = [...d].sort((a, b) => b[1] - a[1])[0][0];
    setOwners(new Map([[mine, 'p'], [theirs, 'a']]));
  }, [graph, ctx.seed]);

  const area = (o: Owner) => [...owners].filter(([, x]) => x === o).reduce((s, [c]) => s + world!.byA2.get(c)!.areaKm2, 0);

  const duel = (f: string, to: string, k: StatKey, actor: Owner, current: Map<string, Owner>) => {
    const win = value(k, f) > value(k, to);
    const next = new Map(current);
    if (win) next.set(to, actor);
    const vars = { from: countryName(f, lang), to: countryName(to, lang), stat: t(`dp.${k}`) };
    setLog((l) => [{ text: `${actor === 'p' ? '🟡' : '🟣'} ${t(win ? 'dp.won' : 'dp.lost', vars)}`, good: (actor === 'p') === win }, ...l].slice(0, 6));
    setOwners(next);
    return next;
  };

  const finish = (final: Map<string, Owner>) => {
    setOver(true);
    const total = [...graph.keys()].reduce((s, c) => s + world!.byA2.get(c)!.areaKm2, 0);
    const mine = [...final].filter(([, o]) => o === 'p').reduce((s, [c]) => s + world!.byA2.get(c)!.areaKm2, 0);
    const pts = Math.min(1000, Math.round((1000 * mine) / (total * 0.5)));
    const stamps = [...final].filter(([, o]) => o === 'p').map(([c]) => c);
    ctx.finish({ points: pts, stamps, meta: { countries: stamps.length } }, { score: String(pts), subtitle: `${stamps.length} 🏳️` });
  };

  const playerDuel = (k: StatKey) => {
    if (!from || !target) return;
    duel(from, target, k, 'p', owners);
    setFrom(null);
    setTarget(null);
    setWho('a');
  };

  // Rival AI: try the duel with the best ratio, preferring player land and big targets.
  useEffect(() => {
    if (who !== 'a' || over) return;
    const id = setTimeout(() => {
      let best: { f: string; to: string; k: StatKey; s: number } | null = null;
      for (const [c, o] of owners) {
        if (o !== 'a') continue;
        for (const n of graph.get(c) ?? []) {
          if (owners.get(n) === 'a') continue;
          for (const k of statKeys) {
            const ratio = (value(k, c) + 1) / (value(k, n) + 1);
            const s = Math.log(ratio) + (owners.get(n) === 'p' ? 0.4 : 0) + Math.log10(world!.byA2.get(n)!.areaKm2) * 0.1 + Math.random() * AI_NOISE;
            if (!best || s > best.s) best = { f: c, to: n, k, s };
          }
        }
      }
      const next = best ? duel(best.f, best.to, best.k, 'a', owners) : owners;
      if (turn >= TURNS) return finish(next);
      setTurn((x) => x + 1);
      setWho('p');
    }, 650);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [who, over]);

  if (!world || !owners.size) return <div className="card muted">{t('common.loading')}</div>;

  const click = (a2: string) => {
    if (who !== 'p' || over) return;
    if (owners.get(a2) === 'p') { setFrom(a2); setTarget(null); return; }
    if (from && (graph.get(from) ?? []).includes(a2)) setTarget(a2);
  };
  const targets = new Set(from ? (graph.get(from) ?? []).filter((n) => owners.get(n) !== 'p') : []);

  return (
    <div className="game-layout">
      <div className="board">
        <RegionMap
          world={world}
          region={REGIONS.asia}
          codes={[...graph.keys()]}
          onClick={click}
          fill={(a2) => owners.get(a2) === 'p' ? 'rgba(245,198,107,0.85)' : owners.get(a2) === 'a' ? 'rgba(155,107,255,0.85)' : targets.has(a2) ? 'rgba(79,209,161,0.4)' : 'rgba(255,255,255,0.16)'}
          stroke={(a2) => (a2 === from || a2 === target ? '#ffffff' : undefined)}
        />
      </div>
      <aside className="side">
        <div className="row">
          <div className="stat-box" style={{ flex: 1 }}><small>{t('dp.turn')}</small><b>{turn} / {TURNS}</b></div>
          <div className="stat-box" style={{ flex: 1 }}><small>🟡 {t('dp.yours')}</small><b style={{ fontSize: 14 }}>{formatKm2(area('p'), lang)}</b></div>
        </div>
        <div className="card">
          {who === 'a' && !over ? <b>{t('dp.ai')}</b> : (
            <>
              <span className="eyebrow">{!from ? t('dp.from') : !target ? t('dp.target') : t('dp.stat')}</span>
              {from && target && (
                <>
                  <div className="duel">
                    <div><img src={flagUrl(from)} alt="" /><b>{countryName(from, lang)}</b></div>
                    <span className="muted">{t('dp.vs')}</span>
                    <div><img src={flagUrl(target)} alt="" /><b>{countryName(target, lang)}</b></div>
                  </div>
                  <div className="wm-options">
                    {statKeys.map((k) => (
                      <button key={k} className="wm-option" onClick={() => playerDuel(k)}>
                        {t(`dp.${k}`)} <span className="muted small" style={{ float: 'right' }}>{fmt(k, value(k, from))}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <ul className="small" style={{ paddingLeft: 16, margin: 0 }}>
          {log.map((l, i) => <li key={i} className={l.good ? 'pill-good' : 'pill-bad'} style={{ marginBottom: 4 }}>{l.text}</li>)}
        </ul>
      </aside>
    </div>
  );
}

export function DiplomacyPage() {
  return (
    <GameShell slug="diplomacy" rules={['dp.rules.1', 'dp.rules.2', 'dp.rules.3']}>
      {(ctx) => <Diplomacy key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
