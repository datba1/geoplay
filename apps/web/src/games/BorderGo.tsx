'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { addGameText } from '@/lib/gameText';
import { countryName, loadWorld, type World } from '@/lib/geo';
import { REGIONS, regionGraph } from '@/lib/regions';
import { GameShell, type GameContext } from '@/components/GameShell';
import { RegionMap } from '@/components/RegionMap';

addGameText({
  en: {
    'bg.you': 'Your move: claim a free country', 'bg.ai': 'Computer is thinking…', 'bg.pass': 'Pass', 'bg.illegal': 'No liberties there: that move would capture yourself.',
    'bg.points': 'Points', 'bg.movesLeft': 'Moves left', 'bg.captures': 'Captured', 'bg.win': 'You win the continent!', 'bg.lose': 'The computer controls more land.', 'bg.tie': 'A perfect tie.',
    'bg.value': 'Value', 'bg.capturedMsg': 'Captured {n} countries',
  },
  vi: {
    'bg.you': 'Lượt bạn: chiếm một nước trống', 'bg.ai': 'Máy đang suy nghĩ…', 'bg.pass': 'Bỏ lượt', 'bg.illegal': 'Ô đó không còn khí: nước đi sẽ tự bị bắt.',
    'bg.points': 'Điểm', 'bg.movesLeft': 'Còn lại', 'bg.captures': 'Đã bắt', 'bg.win': 'Bạn thắng cả lục địa!', 'bg.lose': 'Máy kiểm soát nhiều đất hơn.', 'bg.tie': 'Hoà tuyệt đối.',
    'bg.value': 'Giá trị', 'bg.capturedMsg': 'Đã bắt {n} nước',
  },
});

type Owner = 'p' | 'a';
type Graph = Map<string, string[]>;
type Board = Map<string, Owner>;
const MOVES_EACH = 20;

const valueOf = (km2: number) => (km2 < 50_000 ? 1 : km2 < 200_000 ? 2 : km2 < 600_000 ? 3 : km2 < 1_200_000 ? 4 : 5);

function group(graph: Graph, board: Board, start: string) {
  const owner = board.get(start)!;
  const stones = new Set([start]);
  const libs = new Set<string>();
  const stack = [start];
  while (stack.length) {
    const c = stack.pop()!;
    for (const n of graph.get(c) ?? []) {
      const o = board.get(n);
      if (!o) libs.add(n);
      else if (o === owner && !stones.has(n)) { stones.add(n); stack.push(n); }
    }
  }
  return { stones, libs };
}

/** Plays a stone; returns the new board and captured countries, or null if suicide. */
function play(graph: Graph, board: Board, at: string, who: Owner) {
  if (board.has(at)) return null;
  const next = new Map(board);
  next.set(at, who);
  const captured: string[] = [];
  for (const n of graph.get(at) ?? []) {
    if (next.get(n) && next.get(n) !== who) {
      const g = group(graph, next, n);
      if (g.libs.size === 0) for (const s of g.stones) { next.delete(s); captured.push(s); }
    }
  }
  if (group(graph, next, at).libs.size === 0) return null;
  return { board: next, captured };
}

function aiChoose(graph: Graph, board: Board, values: Map<string, number>) {
  let best: string | null = null;
  let bestScore = -Infinity;
  for (const c of graph.keys()) {
    const r = play(graph, board, c, 'a');
    if (!r) continue;
    let s = values.get(c)! + r.captured.reduce((sum, x) => sum + values.get(x)! * 3, 0);
    const own = group(graph, r.board, c);
    s += Math.min(own.libs.size, 4) * 0.6;
    if (own.libs.size === 1) s -= values.get(c)! + 3; // self-atari
    // pressure: reduce liberties of adjacent player groups
    for (const n of graph.get(c) ?? []) if (r.board.get(n) === 'p' && group(graph, r.board, n).libs.size === 1) s += 2;
    s += Math.random() * 0.4;
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return best;
}

export function BorderGo({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  const [world, setWorld] = useState<World | null>(null);
  const [board, setBoard] = useState<Board>(new Map());
  const [turn, setTurn] = useState<Owner>('p');
  const [movesLeft, setMovesLeft] = useState({ p: MOVES_EACH, a: MOVES_EACH });
  const [caps, setCaps] = useState({ p: 0, a: 0 });
  const [msg, setMsg] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  useEffect(() => { loadWorld().then(setWorld); }, []);
  const graph = useMemo(() => (world ? regionGraph(world, REGIONS.africa) : new Map<string, string[]>()), [world]);
  const values = useMemo(() => new Map([...graph.keys()].map((c) => [c, valueOf(world!.byA2.get(c)!.areaKm2)])), [graph, world]);

  const points = (who: Owner) => [...board].filter(([, o]) => o === who).reduce((s, [c]) => s + values.get(c)!, 0);

  const end = (b: Board) => {
    setOver(true);
    const mine = [...b].filter(([, o]) => o === 'p').reduce((s, [c]) => s + values.get(c)!, 0);
    const theirs = [...b].filter(([, o]) => o === 'a').reduce((s, [c]) => s + values.get(c)!, 0);
    const pts = Math.min(1000, Math.round((1000 * mine) / Math.max(1, mine + theirs)));
    const result = mine > theirs ? 'bg.win' : mine < theirs ? 'bg.lose' : 'bg.tie';
    const stamps = [...b].filter(([, o]) => o === 'p').map(([c]) => c);
    ctx.finish({ points: pts, stamps, meta: { mine, theirs } }, { score: String(pts), subtitle: `${t(result)} ${mine} – ${theirs}` });
  };

  const doMove = (at: string | null, who: Owner) => {
    let b = board;
    if (at) {
      const r = play(graph, board, at, who);
      if (!r) { if (who === 'p') setMsg(t('bg.illegal')); return false; }
      b = r.board;
      setBoard(b);
      setLast(at);
      if (r.captured.length) {
        setCaps((c) => ({ ...c, [who]: c[who] + r.captured.length }));
        setMsg(`${who === 'p' ? '🟡' : '🟣'} ${t('bg.capturedMsg', { n: r.captured.length })}`);
      } else setMsg(null);
    }
    const left = { ...movesLeft, [who]: movesLeft[who] - 1 };
    setMovesLeft(left);
    if (left.p <= 0 && left.a <= 0) { end(b); return true; }
    setTurn(who === 'p' ? 'a' : 'p');
    return true;
  };

  useEffect(() => {
    if (turn !== 'a' || over || !graph.size) return;
    const id = setTimeout(() => doMove(aiChoose(graph, board, values), 'a'), 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, over]);

  if (!world || !graph.size) return <div className="card muted">{t('common.loading')}</div>;

  return (
    <div className="game-layout">
      <div className="board">
        <RegionMap
          world={world}
          region={REGIONS.africa}
          codes={[...graph.keys()]}
          edges={graph}
          onClick={(a2) => turn === 'p' && !over && !board.has(a2) && doMove(a2, 'p')}
          fill={(a2) => board.get(a2) === 'p' ? 'rgba(245,198,107,0.85)' : board.get(a2) === 'a' ? 'rgba(155,107,255,0.85)' : 'rgba(255,255,255,0.15)'}
          stroke={(a2) => (a2 === last ? '#ffffff' : undefined)}
          label={(a2) => (
            <text textAnchor="middle" dy="0.35em" fontSize={11} fontWeight={700} fill={board.has(a2) ? '#0b0f1c' : 'rgba(255,255,255,0.55)'}>
              {values.get(a2)}
            </text>
          )}
        />
      </div>
      <aside className="side">
        <div className="row">
          <div className="stat-box" style={{ flex: 1, borderColor: '#f5c66b' }}><small>🟡 {t('bg.points')}</small><b>{points('p')}</b></div>
          <div className="stat-box" style={{ flex: 1, borderColor: '#9b6bff' }}><small>🟣 {t('bg.points')}</small><b>{points('a')}</b></div>
        </div>
        <div className="row">
          <div className="stat-box" style={{ flex: 1 }}><small>{t('bg.movesLeft')}</small><b>{movesLeft.p}</b></div>
          <div className="stat-box" style={{ flex: 1 }}><small>{t('bg.captures')}</small><b>{caps.p} / {caps.a}</b></div>
        </div>
        <div className="card">
          <b>{over ? '' : turn === 'p' ? t('bg.you') : t('bg.ai')}</b>
          {msg && <p className="small muted">{msg}</p>}
          {last && <p className="small muted">{countryName(last, lang)} · {t('bg.value')} {values.get(last)}</p>}
          <button className="btn btn-sm" disabled={turn !== 'p' || over} onClick={() => doMove(null, 'p')}>{t('bg.pass')}</button>
        </div>
      </aside>
    </div>
  );
}

export function BorderGoPage() {
  return (
    <GameShell slug="border-go" rules={['bg.rules.1', 'bg.rules.2', 'bg.rules.3']}>
      {(ctx) => <BorderGo key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
