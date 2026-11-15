'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { addGameText } from '@/lib/gameText';
import { countryName, loadWorld, type World } from '@/lib/geo';
import { REGIONS, regionGraph, bfs } from '@/lib/regions';
import { GameShell, type GameContext } from '@/components/GameShell';
import { RegionMap } from '@/components/RegionMap';

addGameText({
  en: {
    'bc.you': 'Your move', 'bc.ai': 'Computer is thinking…', 'bc.win': 'Checkmate! You captured the king.', 'bc.lose': 'Your king fell.',
    'bc.draw': 'Move limit reached: draw.', 'bc.moves': 'Moves', 'bc.select': 'Select one of your gold pieces.', 'bc.captured': 'Captured',
    'bc.k': 'King', 'bc.r': 'Rook', 'bc.n': 'Knight', 'bc.log': 'Last moves',
  },
  vi: {
    'bc.you': 'Lượt của bạn', 'bc.ai': 'Máy đang suy nghĩ…', 'bc.win': 'Chiếu hết! Bạn đã bắt được vua.', 'bc.lose': 'Vua của bạn đã bị bắt.',
    'bc.draw': 'Hết giới hạn nước đi: hoà.', 'bc.moves': 'Nước đi', 'bc.select': 'Chọn một quân vàng của bạn.', 'bc.captured': 'Đã ăn',
    'bc.k': 'Vua', 'bc.r': 'Xe', 'bc.n': 'Mã', 'bc.log': 'Nước đi gần đây',
  },
});

type Side = 'p' | 'a';
type Kind = 'k' | 'r' | 'n';
interface Piece { id: string; side: Side; kind: Kind; at: string }
type Graph = Map<string, string[]>;

const VALUE: Record<Kind, number> = { k: 100, r: 5, n: 3 };
const GLYPH: Record<Kind, string> = { k: '♚', r: '♜', n: '♞' };
const MAX_MOVES = 60;

const START: { side: Side; kind: Kind; prefs: string[] }[] = [
  { side: 'p', kind: 'k', prefs: ['FR'] }, { side: 'p', kind: 'r', prefs: ['ES'] }, { side: 'p', kind: 'r', prefs: ['GB', 'NL'] },
  { side: 'p', kind: 'n', prefs: ['BE'] }, { side: 'p', kind: 'n', prefs: ['CH', 'IT'] },
  { side: 'a', kind: 'k', prefs: ['PL'] }, { side: 'a', kind: 'r', prefs: ['RO'] }, { side: 'a', kind: 'r', prefs: ['BY', 'LT'] },
  { side: 'a', kind: 'n', prefs: ['HU'] }, { side: 'a', kind: 'n', prefs: ['UA', 'SK'] },
];

function legalTargets(graph: Graph, pieces: Piece[], piece: Piece): string[] {
  const occ = new Map(pieces.map((p) => [p.at, p]));
  const canLand = (c: string) => !occ.has(c) || occ.get(c)!.side !== piece.side;
  if (piece.kind === 'k') return (graph.get(piece.at) ?? []).filter(canLand);
  if (piece.kind === 'n') {
    const d = bfs(graph, piece.at);
    return [...d].filter(([, v]) => v === 2).map(([c]) => c).filter(canLand);
  }
  // Rook: up to 3 steps through empty countries, may stop on an enemy.
  const out = new Set<string>();
  let frontier = [piece.at];
  const seen = new Set([piece.at]);
  for (let step = 0; step < 3; step++) {
    const next: string[] = [];
    for (const c of frontier) for (const n of graph.get(c) ?? []) {
      if (seen.has(n)) continue;
      seen.add(n);
      const o = occ.get(n);
      if (!o) { out.add(n); next.push(n); } else if (o.side !== piece.side) out.add(n);
    }
    frontier = next;
  }
  return [...out];
}

function applyMove(pieces: Piece[], id: string, to: string) {
  const captured = pieces.find((p) => p.at === to) ?? null;
  return { pieces: pieces.filter((p) => p !== captured).map((p) => (p.id === id ? { ...p, at: to } : p)), captured };
}

function allMoves(graph: Graph, pieces: Piece[], side: Side) {
  return pieces.filter((p) => p.side === side).flatMap((p) => legalTargets(graph, pieces, p).map((to) => ({ id: p.id, to })));
}

/** Greedy one-ply AI that also checks the player's best reply. */
function aiMove(graph: Graph, pieces: Piece[], noise = 0.3, caution = 9) {
  const playerKing = pieces.find((p) => p.side === 'p' && p.kind === 'k');
  const kingDist = playerKing ? bfs(graph, playerKing.at) : new Map<string, number>();
  let best: { id: string; to: string } | null = null;
  let bestScore = -Infinity;
  for (const m of allMoves(graph, pieces, 'a')) {
    const { pieces: after, captured } = applyMove(pieces, m.id, m.to);
    let s = captured ? VALUE[captured.kind] * 10 : 0;
    if (captured?.kind === 'k') return m;
    // Opponent's best capture in reply.
    let worst = 0;
    for (const r of allMoves(graph, after, 'p')) {
      const victim = after.find((p) => p.at === r.to);
      if (victim) worst = Math.max(worst, VALUE[victim.kind]);
    }
    s -= worst * caution;
    const mover = after.find((p) => p.id === m.id)!;
    if (mover.kind !== 'k') s -= (kingDist.get(m.to) ?? 8) * 0.4;
    s += Math.random() * noise;
    if (s > bestScore) { bestScore = s; best = m; }
  }
  return best;
}

export function BorderChess({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  // Easy: the computer plays loosely and rarely sees your replies. Hard: precise and careful.
  const AI_NOISE = ctx.pick(14, 0.3, 0.02);
  const AI_CAUTION = ctx.pick(2, 9, 12);
  const [world, setWorld] = useState<World | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [turn, setTurn] = useState<Side>('p');
  const [moves, setMoves] = useState(0);
  const [over, setOver] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [captured, setCaptured] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => { loadWorld().then(setWorld); }, []);
  const graph = useMemo(() => (world ? regionGraph(world, REGIONS.europe) : new Map<string, string[]>()), [world]);

  useEffect(() => {
    if (!graph.size) return;
    const used = new Set<string>();
    const list: Piece[] = START.map((s, i) => {
      const at = s.prefs.find((c) => graph.has(c) && !used.has(c)) ?? [...graph.keys()].find((c) => !used.has(c))!;
      used.add(at);
      return { id: `${s.side}${i}`, side: s.side, kind: s.kind, at };
    });
    setPieces(list);
  }, [graph]);

  const finish = useCallback((result: 'win' | 'lose' | 'draw', totalMoves: number, caps: string[]) => {
    setOver(result);
    const pts = result === 'win' ? Math.max(400, 1000 - totalMoves * 12) : result === 'draw' ? 250 : Math.min(300, 60 + caps.length * 40);
    ctx.finish({ points: pts, stamps: caps, meta: { result, moves: totalMoves } }, { score: String(pts), subtitle: t(`bc.${result}`) });
  }, [ctx, t]);

  const describe = (p: Piece, to: string, cap: Piece | null) =>
    `${p.side === 'p' ? '🟡' : '🟣'} ${t(`bc.${p.kind}`)} → ${countryName(to, lang)}${cap ? ` ✕ ${t(`bc.${cap.kind}`)}` : ''}`;

  const move = (id: string, to: string) => {
    const mover = pieces.find((p) => p.id === id)!;
    const { pieces: after, captured: cap } = applyMove(pieces, id, to);
    setPieces(after);
    setSelected(null);
    const total = moves + 1;
    setMoves(total);
    setLog((l) => [describe(mover, to, cap), ...l].slice(0, 6));
    const caps = cap && mover.side === 'p' ? [...captured, to] : captured;
    if (cap && mover.side === 'p') ctx.hit(true);
    if (cap && mover.side === 'p') setCaptured(caps);
    if (cap?.kind === 'k') return finish(mover.side === 'p' ? 'win' : 'lose', total, caps);
    if (total >= MAX_MOVES) return finish('draw', total, caps);
    setTurn(mover.side === 'p' ? 'a' : 'p');
  };

  useEffect(() => {
    if (turn !== 'a' || over || !pieces.length) return;
    const id = setTimeout(() => {
      const m = aiMove(graph, pieces, AI_NOISE, AI_CAUTION);
      if (m) move(m.id, m.to);
      else finish('draw', moves, captured);
    }, 550);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, over, pieces]);

  if (!world || !pieces.length) return <div className="card muted">{t('common.loading')}</div>;

  const occ = new Map(pieces.map((p) => [p.at, p]));
  const sel = pieces.find((p) => p.id === selected) ?? null;
  const targets = new Set(sel ? legalTargets(graph, pieces, sel) : []);
  const codes = [...graph.keys()];

  const click = (a2: string) => {
    if (turn !== 'p' || over) return;
    const o = occ.get(a2);
    if (o?.side === 'p') return setSelected(o.id);
    if (sel && targets.has(a2)) move(sel.id, a2);
  };

  return (
    <div className="game-layout">
      <div className="board">
        <RegionMap
          world={world}
          region={REGIONS.europe}
          codes={codes}
          edges={graph}
          onClick={click}
          fill={(a2) => (targets.has(a2) ? (occ.get(a2) ? 'rgba(255,93,108,0.55)' : 'rgba(79,209,161,0.45)') : sel?.at === a2 ? 'rgba(245,198,107,0.5)' : 'rgba(255,255,255,0.15)')}
          label={(a2) => {
            const p = occ.get(a2);
            if (!p) return null;
            return (
              <g>
                <circle r={14} fill={p.side === 'p' ? '#f5c66b' : '#9b6bff'} stroke={p.id === selected ? '#fff' : '#0b0f1c'} strokeWidth={2} />
                <text textAnchor="middle" dy="0.36em" fontSize={17} fill="#0b0f1c">{GLYPH[p.kind]}</text>
              </g>
            );
          }}
        />
      </div>
      <aside className="side">
        <div className="row">
          <div className="stat-box" style={{ flex: 1 }}><small>{t('bc.moves')}</small><b>{moves}</b></div>
          <div className="stat-box" style={{ flex: 1 }}><small>{t('bc.captured')}</small><b>{captured.length}</b></div>
        </div>
        <div className="card">
          <b className={over === 'win' ? 'pill-good' : over ? 'pill-bad' : ''}>
            {over ? t(`bc.${over}`) : turn === 'p' ? t('bc.you') : t('bc.ai')}
          </b>
          {!over && turn === 'p' && <p className="small muted">{sel ? `${t(`bc.${sel.kind}`)} · ${countryName(sel.at, lang)}` : t('bc.select')}</p>}
          <p className="small muted" style={{ marginBottom: 4 }}>{t('bc.log')}</p>
          <ul className="small" style={{ paddingLeft: 16, margin: 0 }}>{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>
        <p className="small muted">♚ {t('bc.k')} · ♜ {t('bc.r')} · ♞ {t('bc.n')}</p>
      </aside>
    </div>
  );
}

export function BorderChessPage() {
  return (
    <GameShell slug="border-chess" rules={['bc.rules.1', 'bc.rules.2', 'bc.rules.3']}>
      {(ctx) => <BorderChess key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
