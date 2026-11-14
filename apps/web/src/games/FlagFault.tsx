'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { countryName, flagUrl } from '@/lib/geo';
import { mulberry32, shuffle } from '@/lib/rng';
import { GameShell, type GameContext } from '@/components/GameShell';

const FAMILIAR = [
  'VN', 'US', 'GB', 'FR', 'DE', 'IT', 'ES', 'PT', 'JP', 'KR', 'CN', 'BR', 'AR', 'CA', 'MX', 'AU', 'NZ', 'IN',
  'TH', 'LA', 'KH', 'MY', 'PH', 'SG', 'TR', 'GR', 'SE', 'NO', 'DK', 'FI', 'IS', 'IE', 'NL', 'BE', 'CH', 'AT',
  'PL', 'CZ', 'UA', 'ZA', 'EG', 'NG', 'KE', 'MA', 'SA', 'AE', 'IL', 'PK', 'BD', 'NP', 'LK', 'MM', 'CU', 'JM',
  'CL', 'CO', 'PE', 'UY', 'GH', 'ET', 'TZ', 'HU', 'RO', 'BG', 'HR', 'EE', 'LV', 'LT', 'MN', 'KZ', 'QA', 'BT',
];

const ROUNDS = 8;
const SECONDS = 15;
const PENALTY = 3;

type Phase = 'loading' | 'playing' | 'found' | 'timeout';
/** Fault bounding box, relative to the flag stage (so scrolling doesn't matter). */
interface Fault { rect: { left: number; top: number; width: number; height: number }; kind: 'recolor' | 'remove' }

/* ----------------------------- colour helpers ----------------------------- */

function parseColor(css: string): [number, number, number] | null {
  const m = css.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  if (a === 0) return null;
  return [r, g, b];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

const NEUTRAL_SWAPS = ['#d52b1e', '#ffce00', '#0052b4', '#009b3a'];

function wrongColor(css: string, rand: () => number): string {
  const rgb = parseColor(css);
  if (!rgb) return NEUTRAL_SWAPS[Math.floor(rand() * NEUTRAL_SWAPS.length)];
  const [h, s, l] = rgbToHsl(...rgb);
  if (s < 0.18 || l < 0.12 || l > 0.92) return NEUTRAL_SWAPS[Math.floor(rand() * NEUTRAL_SWAPS.length)];
  const shift = 90 + rand() * 120;
  return `hsl(${Math.round((h + shift) % 360)}, ${Math.round(Math.max(0.45, s) * 100)}%, ${Math.round(Math.min(0.6, Math.max(0.35, l)) * 100)}%)`;
}

/* ------------------------------ fault picker ------------------------------ */

const SHAPES = 'path, rect, circle, ellipse, polygon, polyline';
const HIDDEN_PARENTS = 'defs, clipPath, mask, marker, pattern, symbol';

/** Topmost shape painted at a screen point, using geometry (works off-screen and while hidden). */
function topmostAt(shapes: SVGGeometryElement[], svg: SVGSVGElement, x: number, y: number) {
  const pt = svg.createSVGPoint();
  for (let i = shapes.length - 1; i >= 0; i--) {
    const el = shapes[i];
    const m = el.getScreenCTM();
    if (!m) continue;
    pt.x = x;
    pt.y = y;
    const local = pt.matrixTransform(m.inverse());
    const style = getComputedStyle(el);
    const filled = style.fill !== 'none' && el.isPointInFill(local);
    const stroked = style.stroke !== 'none' && el.isPointInStroke(local);
    if (filled || stroked) return el;
  }
  return null;
}

/** Mutates one visible element of the flag and returns where it is. */
function plantFault(stage: HTMLElement, rand: () => number): Fault | null {
  const svg = stage.querySelector('svg');
  if (!svg) return null;
  const box = stage.getBoundingClientRect();
  const flagArea = box.width * box.height;
  const shapes = [...svg.querySelectorAll<SVGGeometryElement>(SHAPES)].filter((el) => !el.closest(HIDDEN_PARENTS));

  const candidates: { el: SVGGeometryElement; rect: DOMRect }[] = [];
  for (const el of shapes) {
    const rect = el.getBoundingClientRect();
    const visW = Math.min(rect.right, box.right) - Math.max(rect.left, box.left);
    const visH = Math.min(rect.bottom, box.bottom) - Math.max(rect.top, box.top);
    if (visW <= 0 || visH <= 0) continue;
    const share = (visW * visH) / flagArea;
    if (share > 0.5 || share < 0.004) continue;
    // Must actually be visible: sample a grid inside the visible part of its box.
    const left = Math.max(rect.left, box.left);
    const top = Math.max(rect.top, box.top);
    let hits = 0;
    for (let i = 1; i <= 4; i++) for (let j = 1; j <= 4; j++) {
      if (topmostAt(shapes, svg, left + (visW * i) / 5, top + (visH * j) / 5) === el) hits++;
    }
    if (hits >= 2) candidates.push({ el, rect });
  }
  if (!candidates.length) return null;

  const { el, rect } = candidates[Math.floor(rand() * candidates.length)];
  const style = getComputedStyle(el);
  const hasFill = parseColor(style.fill) !== null;
  const hasStroke = parseColor(style.stroke) !== null && parseFloat(style.strokeWidth) > 2;
  const canRecolor = hasFill || hasStroke;
  const kind: Fault['kind'] = canRecolor && rand() < 0.7 ? 'recolor' : 'remove';

  if (kind === 'recolor') {
    if (hasFill) el.style.fill = wrongColor(style.fill, rand);
    else el.style.stroke = wrongColor(style.stroke, rand);
  } else {
    el.style.visibility = 'hidden';
  }
  return { rect: { left: rect.left - box.left, top: rect.top - box.top, width: rect.width, height: rect.height }, kind };
}

/* --------------------------------- game ---------------------------------- */

export function FlagFault({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  const [order] = useState(() => shuffle(FAMILIAR, mulberry32(ctx.seed)));
  const randRef = useRef(mulberry32(ctx.seed ^ 0x9e3779b9));
  const [cursor, setCursor] = useState(0); // index into `order` (skips flags without candidates)
  const [round, setRound] = useState(0);
  const [svgText, setSvgText] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const [score, setScore] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const [misses, setMisses] = useState<{ x: number; y: number }[]>([]);
  const [hint, setHint] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const faultRef = useRef<Fault | null>(null);
  const deadline = useRef(0);
  const a2 = order[cursor];

  // Load the flag's SVG text.
  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    setSvgText(null);
    fetch(flagUrl(a2))
      .then((r) => r.text())
      .then((txt) => !cancelled && setSvgText(txt));
    return () => { cancelled = true; };
  }, [a2]);

  // Once it is in the DOM, plant the fault.
  useLayoutEffect(() => {
    if (!svgText || !stageRef.current) return;
    stageRef.current.querySelector('.flag-svg')!.innerHTML = svgText;
    const fault = plantFault(stageRef.current, randRef.current);
    if (!fault) {
      setCursor((c) => (c + 1) % order.length);
      return;
    }
    faultRef.current = fault;
    setMisses([]);
    setHint(null);
    setMessage(null);
    deadline.current = performance.now() + SECONDS * 1000;
    setTimeLeft(SECONDS);
    setPhase('playing');
  }, [svgText, order.length]);

  const showHint = useCallback(() => {
    const r = faultRef.current!.rect;
    const pad = 6;
    setHint({ left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      const left = Math.max(0, (deadline.current - performance.now()) / 1000);
      setTimeLeft(left);
      if (left <= 0) {
        setPhase('timeout');
        setMessage(t('ff.timeout'));
        showHint();
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, showHint, t]);

  const next = useCallback(() => {
    if (round + 1 >= ROUNDS) {
      const finalFound = found;
      ctx.finish(
        {
          points: score,
          stamps: finalFound,
          flags: finalFound.length === ROUNDS ? { 'ff-perfect': true } : {},
          meta: { found: finalFound.length },
        },
        { score: String(score), subtitle: `${finalFound.length} / ${ROUNDS}` },
      );
      return;
    }
    setRound((r) => r + 1);
    setCursor((c) => (c + 1) % order.length);
  }, [round, found, score, ctx, order.length]);

  const onTap = (e: React.MouseEvent) => {
    if (phase !== 'playing' || !faultRef.current) return;
    const r = faultRef.current.rect;
    const stage = stageRef.current!.getBoundingClientRect();
    const x = e.clientX - stage.left;
    const y = e.clientY - stage.top;
    const tol = 8;
    const inside = x >= r.left - tol && x <= r.left + r.width + tol && y >= r.top - tol && y <= r.top + r.height + tol;
    if (inside) {
      const left = Math.max(0, (deadline.current - performance.now()) / 1000);
      setScore((s) => s + 100 + Math.round(left * 10));
      setFound((f) => [...f, a2]);
      setPhase('found');
      setMessage(t('ff.correct'));
      showHint();
    } else {
      deadline.current -= PENALTY * 1000;
      setMisses((m) => [...m, { x, y }]);
      setMessage(t('ff.wrong'));
    }
  };

  return (
    <div className="game-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) 260px' }}>
      <div className="card">
        <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          <span className="muted">{t('ff.find')}</span>
          <h2 style={{ fontSize: 30 }}>{countryName(a2, lang)}</h2>
          <span className="spacer" />
          {message && <b className={phase === 'found' ? 'pill-good' : 'pill-bad'}>{message}</b>}
        </div>
        <div className="timer-bar" style={{ marginBottom: 14 }}>
          <div style={{ width: `${(timeLeft / SECONDS) * 100}%`, background: timeLeft < 5 ? 'var(--red)' : undefined }} />
        </div>
        <div ref={stageRef} className="flag-stage" onClick={onTap} style={{ opacity: phase === 'loading' ? 0 : 1 }}>
          <div className="flag-svg" style={{ width: '100%', height: '100%' }} />
          {misses.map((m, i) => <span key={i} className="flag-miss" style={{ left: m.x, top: m.y }} />)}
          {hint && <span className="flag-hint" style={hint} />}
        </div>
        {(phase === 'found' || phase === 'timeout') && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button className="btn btn-primary" onClick={next}>{t('common.next')} →</button>
          </div>
        )}
      </div>
      <aside className="side">
        <div className="stat-box"><small>{t('common.round')}</small><b>{round + 1} / {ROUNDS}</b></div>
        <div className="stat-box"><small>{t('common.score')}</small><b>{score}</b></div>
        <div className="stat-box"><small>{t('common.time')}</small><b>{timeLeft.toFixed(1)}s</b></div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {found.map((f) => <img key={f} src={flagUrl(f)} alt={f} width={34} style={{ borderRadius: 3 }} />)}
        </div>
      </aside>
    </div>
  );
}

export function FlagFaultPage() {
  return (
    <GameShell slug="flag-fault" rules={['ff.rules.1', 'ff.rules.2', 'ff.rules.3']}>
      {(ctx) => <FlagFault key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
