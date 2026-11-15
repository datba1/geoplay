/**
 * Hand-drawn line glyphs on a 100×100 grid (content roughly 26–74).
 * Drawn with `stroke="currentColor"`; the caller decides whether they are
 * embossed into metal or inked onto paper.
 */
import type { ReactNode } from 'react';

const star = (cx: number, cy: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
};

const wing = 'M48 60 C40 48 31 43 24 43 M48 63 C40 55 31 52 26 54 M48 66 C42 63 35 63 30 66';
const plane = (
  <>
    <path d="M50 26 C53 26 54 30 54 34 V48 L72 58 V62 L54 57 V66 L60 71 V74 L50 71 L40 74 V71 L46 66 V57 L28 62 V58 L46 48 V34 C46 30 47 26 50 26 Z" />
  </>
);
const compass = (
  <>
    <circle cx="50" cy="50" r="20" />
    <path d="M50 32 L55 50 L50 68 L45 50 Z" />
    <path d="M50 32 L55 50 H45 Z" className="fill" />
    <path d="M50 26 V30 M50 70 V74 M26 50 H30 M70 50 H74" />
  </>
);

export const GLYPHS: Record<string, ReactNode> = {
  /* badges */
  departure: plane,
  explorer: compass,
  'stamps-10': (
    <>
      <rect x="28" y="36" width="44" height="30" rx="3" />
      <path d="M28 38 L50 54 L72 38" />
      <rect x="58" y="42" width="9" height="10" className="fill" />
    </>
  ),
  'stamps-30': (
    <>
      <path d="M28 34 L41 29 L59 35 L72 30 V66 L59 71 L41 65 L28 70 Z" />
      <path d="M41 29 V65 M59 35 V71" />
      <path d="M46 48 C50 44 54 52 58 47" strokeDasharray="2 3" />
    </>
  ),
  'stamps-75': (
    <>
      <circle cx="50" cy="48" r="19" />
      <path d="M31 48 H69 M50 29 C42 38 42 58 50 67 M50 29 C58 38 58 58 50 67" />
      <path d="M40 74 H60 M50 67 V74" />
    </>
  ),
  'level-5': (
    <>
      <path d={wing} />
      <path d={wing} transform="translate(100 0) scale(-1 1)" />
      <circle cx="50" cy="56" r="5" className="fill" />
    </>
  ),
  'level-10': (
    <>
      <path d="M50 24 L55 45 L76 50 L55 55 L50 76 L45 55 L24 50 L45 45 Z" />
      <path d="M50 24 L55 45 L50 50 Z M76 50 L55 55 L50 50 Z M50 76 L45 55 L50 50 Z M24 50 L45 45 L50 50 Z" className="fill" />
    </>
  ),
  'daily-1': (
    <>
      <rect x="31" y="34" width="38" height="36" rx="4" />
      <path d="M31 44 H69 M41 29 V38 M59 29 V38" />
      <path d="M41 57 L47 63 L60 50" />
    </>
  ),
  'streak-3': (
    <path d="M50 26 C58 36 66 43 66 56 C66 66 59 73 50 73 C41 73 34 66 34 57 C34 49 39 45 42 38 C45 44 47 47 50 49 C51 41 48 33 50 26 Z M50 73 C45 73 43 68 43 64 C43 59 47 57 50 53 C53 57 57 60 57 65 C57 69 54 73 50 73" />
  ),
  'streak-7': (
    <>
      <circle cx="60" cy="40" r="9" className="fill" />
      <path d="M53 47 L28 72 M52 39 L32 57 M61 49 L45 67" />
    </>
  ),
  'ts-3star': (
    <>
      <path d={star(50, 38, 12)} className="fill" />
      <path d={star(33, 62, 9)} />
      <path d={star(67, 62, 9)} />
    </>
  ),
  'ff-perfect': (
    <>
      <path d="M24 50 C34 36 66 36 76 50 C66 64 34 64 24 50 Z" />
      <circle cx="50" cy="50" r="9" />
      <circle cx="50" cy="50" r="3.5" className="fill" />
    </>
  ),
  'bs-80': (
    <>
      <path d="M33 68 L36 58 L60 34 L67 41 L43 65 Z" />
      <path d="M56 38 L63 45 M36 58 L43 65" />
      <path d="M30 74 C40 70 52 76 70 70" />
    </>
  ),

  /* items */
  coral: (
    <path d="M50 74 V52 M50 62 L40 52 V40 M50 54 L60 44 V32 M40 52 L32 46 V40 M60 44 L68 40 M40 44 L46 38 M60 38 L54 32 M36 74 H64" />
  ),
  plane: (
    <>
      <path d="M26 50 L74 30 L60 72 L50 56 Z" />
      <path d="M74 30 L50 56 L48 68" />
    </>
  ),
  compass,
  lotus: (
    <>
      <path d="M50 66 C42 58 42 44 50 32 C58 44 58 58 50 66 Z" />
      <path d="M50 66 C40 66 31 58 28 46 C38 47 45 54 50 66 Z" />
      <path d="M50 66 C60 66 69 58 72 46 C62 47 55 54 50 66 Z" />
      <path d="M32 72 H68" />
    </>
  ),
  lantern: (
    <>
      <path d="M38 40 C44 34 56 34 62 40 C66 46 66 56 62 62 C56 68 44 68 38 62 C34 56 34 46 38 40 Z" />
      <path d="M44 34 V29 H56 V34 M44 67 V71 H56 V67 M50 35 V67 M41 38 C38 46 38 56 41 64 M59 38 C62 46 62 56 59 64" />
      <path d="M50 71 V77" />
    </>
  ),
  kite: (
    <>
      <path d="M50 26 L66 44 L50 62 L34 44 Z" />
      <path d="M50 26 V62 M34 44 H66" />
      <path d="M50 62 C46 66 54 69 50 73 C46 76 52 78 50 78" />
    </>
  ),
  balloon: (
    <>
      <path d="M50 26 C63 26 68 37 66 46 C64 55 56 60 50 62 C44 60 36 55 34 46 C32 37 37 26 50 26 Z" />
      <path d="M44 60 L46 67 M56 60 L54 67 M50 26 V62" />
      <rect x="44" y="67" width="12" height="8" rx="1.5" />
    </>
  ),
  telescope: (
    <>
      <path d="M28 54 L62 36 L67 45 L33 63 Z" />
      <path d="M62 36 L66 34 L71 43 L67 45 M48 52 L40 74 M48 52 L57 74 M48 52 V74" />
    </>
  ),
  ship: (
    <>
      <path d="M26 60 H74 L67 70 H33 Z" />
      <path d="M50 60 V26" />
      <path d="M50 29 L66 55 H50 M50 33 L36 55 H50" />
      <path d="M50 26 L58 29 L50 32" className="fill" />
    </>
  ),
  volcano: (
    <>
      <path d="M26 72 L42 46 H58 L74 72 Z" />
      <path d="M42 46 L46 52 L50 48 L54 53 L58 46" />
      <path d="M48 42 C44 37 48 33 46 28 M54 41 C58 36 55 32 58 27" />
    </>
  ),
  aurora: (
    <>
      <path d="M26 42 C34 32 42 48 50 38 C58 28 66 44 74 34" />
      <path d="M26 52 C34 42 42 58 50 48 C58 38 66 54 74 44" strokeDasharray="3 3" />
      <path d="M26 72 L38 60 L46 67 L56 56 L74 72 Z" />
    </>
  ),
  satellite: (
    <>
      <rect x="43" y="43" width="14" height="14" rx="2" transform="rotate(45 50 50)" />
      <rect x="22" y="46" width="15" height="8" transform="rotate(45 50 50)" />
      <rect x="63" y="46" width="15" height="8" transform="rotate(45 50 50)" />
      <path d="M40 40 L33 33 M30 30 C34 26 38 30 34 34" />
    </>
  ),
};

/** Renders a glyph; `.fill` sub-shapes are filled with the stroke colour. */
export function Glyph({ id, width = 6 }: { id: string; width?: number }) {
  return (
    <g fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" className="glyph">
      {GLYPHS[id] ?? GLYPHS.compass}
    </g>
  );
}
