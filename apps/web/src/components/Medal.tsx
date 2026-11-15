'use client';

import { useId, type ReactNode } from 'react';
import { Glyph } from './glyphs';

export type Metal = 'bronze' | 'silver' | 'gold' | 'platinum' | 'iron';

/** hi = lit face, mid = body, lo = shadow side, edge = outer rim, ink = recessed relief */
const METALS: Record<Metal, { hi: string; mid: string; lo: string; edge: string; ink: string; ribbon: [string, string] }> = {
  bronze: { hi: '#f6c99b', mid: '#bd7a45', lo: '#6e3b17', edge: '#4a250c', ink: '#5a2e10', ribbon: ['#7a2f2a', '#c8833f'] },
  silver: { hi: '#ffffff', mid: '#bfc7d0', lo: '#69727e', edge: '#3f4650', ink: '#4c5560', ribbon: ['#24456e', '#d5dbe2'] },
  gold: { hi: '#fff3b8', mid: '#dcaa3e', lo: '#8c5b11', edge: '#583705', ink: '#6b4409', ribbon: ['#7b1f2c', '#e9c25a'] },
  platinum: { hi: '#f2ffff', mid: '#a9d6dc', lo: '#4d8189', edge: '#2b4f55', ink: '#33636b', ribbon: ['#1d3c4a', '#9fe0e4'] },
  iron: { hi: '#6a707b', mid: '#3a3f48', lo: '#1f2228', edge: '#14161a', ink: '#14161a', ribbon: ['#2a2d33', '#3d4149'] },
};

const ticks = Array.from({ length: 48 }, (_, i) => {
  const a = (i / 48) * Math.PI * 2;
  const long = i % 12 === 0;
  const r1 = long ? 36.5 : 38.6;
  const r2 = 40.6;
  return `M${(50 + r1 * Math.sin(a)).toFixed(2)} ${(50 - r1 * Math.cos(a)).toFixed(2)}L${(50 + r2 * Math.sin(a)).toFixed(2)} ${(50 - r2 * Math.cos(a)).toFixed(2)}`;
}).join('');

const reeds = Array.from({ length: 72 }, (_, i) => {
  const a = (i / 72) * Math.PI * 2;
  return `M${(50 + 45 * Math.sin(a)).toFixed(2)} ${(50 - 45 * Math.cos(a)).toFixed(2)}L${(50 + 48.5 * Math.sin(a)).toFixed(2)} ${(50 - 48.5 * Math.cos(a)).toFixed(2)}`;
}).join('');

/** The struck coin: reeded edge, polished rim, compass bezel and a recessed field with raised relief. */
function Coin({ metal, children, bezel = true, small = false }: { metal: Metal; children: ReactNode; bezel?: boolean; small?: boolean }) {
  const m = METALS[metal];
  const id = useId().replace(/:/g, '');
  return (
    <>
      <defs>
        <linearGradient id={`rim${id}`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={m.hi} />
          <stop offset="0.45" stopColor={m.mid} />
          <stop offset="1" stopColor={m.lo} />
        </linearGradient>
        <linearGradient id={`field${id}`} x1="0.85" y1="1" x2="0.15" y2="0">
          <stop offset="0" stopColor={m.hi} stopOpacity="0.9" />
          <stop offset="0.55" stopColor={m.mid} />
          <stop offset="1" stopColor={m.lo} />
        </linearGradient>
        <radialGradient id={`shine${id}`} cx="0.32" cy="0.26" r="0.55">
          <stop offset="0" stopColor="#fff" stopOpacity={metal === 'iron' ? 0.08 : 0.55} />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="51.5" r="48.5" fill="#000" opacity="0.35" />
      <circle cx="50" cy="50" r="48.5" fill={m.edge} />
      <path d={reeds} stroke={m.mid} strokeWidth="1.3" opacity="0.7" />
      <circle cx="50" cy="50" r="44.5" fill={`url(#rim${id})`} />
      <circle cx="50" cy="50" r="35" fill={`url(#field${id})`} stroke={m.lo} strokeWidth="1" />
      <circle cx="50" cy="50" r="34" fill="none" stroke={m.hi} strokeOpacity="0.35" strokeWidth="0.8" />
      {bezel && (
        <>
          <path d={ticks} stroke={m.ink} strokeWidth="1.2" opacity="0.75" />
          <path d="M50 5.8 L52.6 10.4 H47.4 Z" fill={m.ink} opacity="0.8" />
        </>
      )}
      {/* relief: shadow, highlight, then the face */}
      {small ? (
        <>
          <g transform="translate(0 2)" color={m.hi} opacity="0.7">{children}</g>
          <g color={m.edge}>{children}</g>
        </>
      ) : (
        <>
          <g transform="translate(0.9 1.1)" color={m.lo} opacity="0.9">{children}</g>
          <g transform="translate(-0.6 -0.7)" color={m.hi} opacity="0.85">{children}</g>
          <g color={m.ink} opacity={metal === 'iron' ? 0.9 : 0.75}>{children}</g>
        </>
      )}
      <circle cx="50" cy="50" r="44.5" fill={`url(#shine${id})`} />
    </>
  );
}

/** Rank medal: the level number struck into the coin. */
export function RankCoin({ tier, level, size = 34 }: { tier: Metal; level: number; size?: number }) {
  const digits = String(level).length;
  return (
    <svg className="coin" width={size} height={size} viewBox="-2 -2 104 104" role="img" aria-label={`Level ${level}`}>
      <Coin metal={tier} bezel={size >= 48} small={size < 48}>
        <text
          x="50" y="51" textAnchor="middle" dominantBaseline="central" fill="currentColor"
          style={{ font: `700 ${size < 48 ? (digits > 1 ? 40 : 52) : digits > 2 ? 26 : digits > 1 ? 32 : 40}px var(--font-display)` }}
        >
          {level}
        </text>
      </Coin>
    </svg>
  );
}

/** Badge medal on a short ribbon. */
export function BadgeMedal({ glyph, metal, locked, size = 84 }: { glyph: string; metal: Metal; locked?: boolean; size?: number }) {
  const m = METALS[locked ? 'iron' : metal];
  const [a, b] = m.ribbon;
  return (
    <svg className={`badge-medal ${locked ? 'locked' : ''}`} width={size} height={size * 1.3} viewBox="0 0 100 130" aria-hidden>
      {/* ribbon: two folded strips with a stripe */}
      <path d="M30 0 H50 L58 46 H40 Z" fill={a} />
      <path d="M50 0 H70 L60 46 H42 Z" fill={a} />
      <path d="M37 0 H43 L49 42 H45 Z M57 0 H63 L57 42 H53 Z" fill={b} opacity="0.85" />
      <path d="M30 0 H70" stroke="#000" strokeOpacity="0.25" strokeWidth="2" />
      <rect x="44" y="34" width="12" height="9" rx="2" fill={m.edge} />
      <g transform="translate(0 30)">
        <Coin metal={locked ? 'iron' : metal} bezel={false}>
          <Glyph id={glyph} width={5} />
        </Coin>
      </g>
    </svg>
  );
}

/** Paper luggage tag with an inked drawing; locked items are a pencil outline. */
export function ItemTag({ glyph, locked, size = 96 }: { glyph: string; locked?: boolean; size?: number }) {
  return (
    <svg className={`item-tag ${locked ? 'locked' : ''}`} width={size} height={size * 1.25} viewBox="0 0 100 125" aria-hidden>
      
      <path d="M10 22 L36 4 H64 L90 22 V114 Q90 121 83 121 H17 Q10 121 10 114 Z" className="tag-paper" />
      <circle cx="50" cy="14" r="4.5" className="tag-hole" />
      <circle cx="50" cy="14" r="7" fill="none" className="tag-ring" strokeWidth="2" />
      <g transform="translate(0 16)" className="tag-ink">
        <Glyph id={glyph} width={locked ? 2.5 : 4.5} />
      </g>
      <path d="M24 110 H76" className="tag-rule" strokeDasharray="2 3" />
    </svg>
  );
}
