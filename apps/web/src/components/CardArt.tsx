/**
 * Small original line drawings for game cards (160×92). They draw with
 * `currentColor`, so each card's accent colour tints its art.
 */
const common = {
  viewBox: '0 0 160 92',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
};

function TrueSizeArt() {
  return (
    <svg {...common}>
      <path d="M46 14c14-6 34-4 46 4s22 6 26 18-4 22-2 32-12 16-26 14-26 2-38-6-18-20-14-32 0-24 8-30z" strokeDasharray="4 4" opacity=".7" />
      <path d="M58 30l16-4 6 12-10 10-14-4z" fill="currentColor" fillOpacity=".25" />
      <path d="M82 30l14 2 4 14-14 4-6-10z" fill="currentColor" fillOpacity=".4" />
      <path d="M64 52l14 2 2 14-16 2-6-10z" fill="currentColor" fillOpacity=".3" />
      <path d="M86 54l12-2 6 10-8 10-12-4z" fill="currentColor" fillOpacity=".18" />
      <path d="M128 70l8-8m0 0h-6m6 0v6" opacity=".6" />
    </svg>
  );
}

function BorderSketchArt() {
  return (
    <svg {...common}>
      <path d="M30 60c4-14 10-30 24-36s20 6 30 2 22-12 30-2-4 22 2 32-8 18-22 16-18-8-30-4-30 4-34-8z" opacity=".85" />
      <path d="M32 62c6-12 10-26 22-34" strokeDasharray="2 5" opacity=".5" />
      <g transform="rotate(35 128 34)">
        <rect x="120" y="10" width="12" height="40" rx="2" fill="currentColor" fillOpacity=".2" />
        <path d="M120 50l6 10 6-10" />
        <path d="M120 18h12" />
      </g>
      <text x="138" y="84" fontSize="9" fill="currentColor" stroke="none" opacity=".6">N↑</text>
    </svg>
  );
}

function FlagFaultArt() {
  return (
    <svg {...common}>
      <path d="M28 16v66" />
      <rect x="28" y="16" width="70" height="46" rx="2" />
      <path d="M28 31h70M28 46h70" opacity=".5" />
      <path d="M28 16h26v15H28z" fill="currentColor" fillOpacity=".3" />
      <circle cx="74" cy="38" r="5" fill="currentColor" fillOpacity=".8" />
      <circle cx="112" cy="50" r="18" />
      <path d="M125 63l14 14" strokeWidth="3" />
      <path d="M104 50h16M112 42v16" opacity=".5" />
    </svg>
  );
}

function WarpedMapArt() {
  return (
    <svg {...common}>
      <path d="M22 50c4-18 22-26 38-22s20 18 14 30-26 16-38 10-16-10-14-18z" fill="currentColor" fillOpacity=".18" />
      <path d="M84 40c6-6 16-6 20 0s0 14-8 14-16-6-12-14z" fill="currentColor" fillOpacity=".3" />
      <circle cx="126" cy="36" r="6" />
      <path d="M70 70c14 8 40 8 60-4" strokeDasharray="3 4" opacity=".6" />
    </svg>
  );
}

function GlobeCutArt() {
  return (
    <svg {...common}>
      <circle cx="80" cy="46" r="34" />
      <ellipse cx="80" cy="46" rx="14" ry="34" opacity=".35" />
      <path d="M46 46h68" opacity=".35" />
      <path d="M34 70C60 52 96 32 132 20" strokeWidth="2.4" />
      <circle cx="34" cy="70" r="3" fill="currentColor" />
      <circle cx="132" cy="20" r="3" fill="currentColor" />
    </svg>
  );
}

function FlagPainterArt() {
  return (
    <svg {...common}>
      <rect x="22" y="18" width="76" height="52" rx="2" />
      <path d="M22 18l76 52" opacity=".4" />
      <path d="M22 44h76" opacity=".4" />
      <path d="M60 18v52" opacity=".4" />
      <path d="M22 18h38v26H22z" fill="currentColor" fillOpacity=".35" />
      <path d="M112 72l22-40 6 4-20 40z" fill="currentColor" fillOpacity=".2" />
      <path d="M134 32c2-6 6-10 10-8s0 8-4 12" />
    </svg>
  );
}


function ShadowHuntArt() {
  return (
    <svg {...common}>
      <circle cx="52" cy="46" r="32" />
      <path d="M38 34c6-6 18-4 22 2s-2 14 4 18-8 10-16 6-14-18-10-26z" fill="currentColor" fillOpacity=".3" />
      <path d="M100 30h40v36h-40z" opacity=".35" />
      <path d="M108 40c6-4 14-2 16 2s-2 10 2 12-6 6-10 4-10-12-8-18z" fill="currentColor" fillOpacity=".7" />
      <path d="M86 46h10" strokeDasharray="2 3" />
    </svg>
  );
}
function SunsetChaseArt() {
  return (
    <svg {...common}>
      <path d="M10 66h140" opacity=".4" />
      <path d="M40 66a40 40 0 0 1 80 0" fill="currentColor" fillOpacity=".25" />
      <path d="M80 18v8M48 30l5 6M112 30l-5 6M30 50h8M122 50h8" opacity=".6" />
      <path d="M96 40l16-6-4 6 4 6z" fill="currentColor" />
      <path d="M20 78c30-6 90-6 120 0" strokeDasharray="3 4" opacity=".5" />
    </svg>
  );
}
function QuakeHuntArt() {
  return (
    <svg {...common}>
      <circle cx="56" cy="46" r="26" opacity=".7" />
      <circle cx="104" cy="40" r="30" opacity=".5" />
      <circle cx="84" cy="70" r="18" opacity=".35" />
      <circle cx="80" cy="56" r="4" fill="currentColor" />
      <path d="M10 84l10-8 6 6 8-14 6 12 8-6" opacity=".6" />
    </svg>
  );
}
function NationScalesArt() {
  return (
    <svg {...common}>
      <path d="M80 18v62M60 82h40" />
      <path d="M30 30l100-8" />
      <path d="M30 30l-14 26h28zM130 22l-14 26h28z" opacity=".7" />
      <path d="M16 56h28M116 48h28" />
      <rect x="22" y="44" width="16" height="10" fill="currentColor" fillOpacity=".5" />
      <rect x="118" y="38" width="8" height="8" fill="currentColor" fillOpacity=".4" />
      <rect x="128" y="40" width="8" height="6" fill="currentColor" fillOpacity=".4" />
    </svg>
  );
}
function FlagMashupArt() {
  return (
    <svg {...common}>
      <rect x="30" y="18" width="100" height="60" rx="2" />
      <path d="M30 18h50v60H30z" fill="currentColor" fillOpacity=".2" />
      <path d="M80 18v60" strokeDasharray="4 3" />
      <path d="M80 38h50M80 58h50" opacity=".5" />
      <circle cx="55" cy="48" r="9" fill="currentColor" fillOpacity=".6" />
    </svg>
  );
}
function BorderChessArt() {
  return (
    <svg {...common}>
      <path d="M20 60l24-30 30 10 26-16 30 24-20 26-36 4-34-6z" opacity=".5" />
      <path d="M44 30l30 10M74 40l26-16M74 40l-4 40M100 24l10 50" strokeDasharray="2 4" opacity=".5" />
      <text x="62" y="56" fontSize="26" fill="currentColor" stroke="none">♞</text>
      <text x="96" y="44" fontSize="18" fill="currentColor" stroke="none" opacity=".6">♚</text>
    </svg>
  );
}
function BorderGoArt() {
  return (
    <svg {...common}>
      <path d="M40 18l40 4 30 22-10 40-40 2-30-30z" opacity=".5" />
      <circle cx="58" cy="36" r="9" fill="currentColor" />
      <circle cx="82" cy="50" r="9" fill="currentColor" />
      <circle cx="62" cy="62" r="9" fill="none" />
      <circle cx="96" cy="66" r="9" fill="none" />
    </svg>
  );
}
function DiplomacyArt() {
  return (
    <svg {...common}>
      <rect x="40" y="14" width="40" height="60" rx="5" transform="rotate(-10 60 44)" />
      <rect x="78" y="16" width="40" height="60" rx="5" fill="currentColor" fillOpacity=".15" transform="rotate(8 98 46)" />
      <path d="M50 30h20M50 40h14" transform="rotate(-10 60 44)" opacity=".6" />
      <path d="M88 32h20M88 42h14" transform="rotate(8 98 46)" opacity=".6" />
    </svg>
  );
}
function NewWorldArt() {
  const hex = (x: number, y: number) => Array.from({ length: 6 }, (_, i) => `${x + 9 * Math.cos((Math.PI / 3) * i)},${y + 9 * Math.sin((Math.PI / 3) * i)}`).join(' ');
  const cells = [[50, 30], [63, 38], [63, 54], [50, 62], [37, 54], [37, 38], [76, 46], [89, 38], [89, 54], [102, 46], [76, 62]];
  return (
    <svg {...common}>
      {cells.map(([x, y], i) => <polygon key={i} points={hex(x, y)} fill="currentColor" fillOpacity={i < 4 ? 0.5 : 0.08} />)}
    </svg>
  );
}
function ElementsArt() {
  return (
    <svg {...common}>
      <circle cx="44" cy="46" r="18" />
      <circle cx="82" cy="46" r="18" fill="currentColor" fillOpacity=".2" />
      <path d="M102 46h12m0 0l-5-5m5 5l-5 5" />
      <path d="M126 62l10-26 10 26z" fill="currentColor" fillOpacity=".5" />
      <path d="M36 50c4-10 12-10 16 0" opacity=".7" /><path d="M78 40l8 12" opacity=".7" />
    </svg>
  );
}

function CapitalPinArt() {
  return (
    <svg {...common}>
      <path d="M14 30c14-8 30-6 42 0s26 8 38 2 30-6 52 2" opacity=".35" />
      <path d="M14 62c18-6 34-2 48 4s30 4 44-2 26-4 40 2" opacity=".35" />
      <circle cx="58" cy="54" r="3" fill="currentColor" fillOpacity=".5" />
      <path d="M58 54 L96 34" strokeDasharray="3 4" opacity=".7" />
      <path d="M96 14c-8 0-13 6-13 13 0 10 13 22 13 22s13-12 13-22c0-7-5-13-13-13z" fill="currentColor" fillOpacity=".22" />
      <circle cx="96" cy="27" r="4.5" />
    </svg>
  );
}

function SilhouetteArt() {
  return (
    <svg {...common}>
      <path d="M62 16l10 6 4 12 10 4-2 12 8 10-6 10-12 2-6 8-10-4-4-10-10-6 2-12-6-10 8-8 2-10z" fill="currentColor" fillOpacity=".3" />
      <path d="M110 30h30M110 46h22M110 62h26" opacity=".55" />
      <path d="M104 30h-1M104 46h-1M104 62h-1" strokeWidth="3" />
    </svg>
  );
}

function HigherLowerArt() {
  return (
    <svg {...common}>
      <rect x="34" y="40" width="26" height="40" rx="3" fill="currentColor" fillOpacity=".2" />
      <rect x="100" y="18" width="26" height="62" rx="3" fill="currentColor" fillOpacity=".4" />
      <path d="M20 80h120" opacity=".5" />
      <path d="M74 54l6-8 6 8M80 46v20" opacity=".8" />
      <path d="M47 30h0M113 8h0" strokeWidth="4" />
    </svg>
  );
}

function NorthSouthArt() {
  return (
    <svg {...common}>
      <circle cx="80" cy="46" r="32" opacity=".5" />
      <path d="M80 18l7 28-7 28-7-28z" />
      <path d="M80 18l7 28h-14z" fill="currentColor" fillOpacity=".5" />
      <path d="M20 30h34M106 62h34" strokeDasharray="3 4" opacity=".6" />
      <circle cx="26" cy="30" r="3" fill="currentColor" />
      <circle cx="134" cy="62" r="3" fill="currentColor" fillOpacity=".5" />
    </svg>
  );
}

const ARTS: Record<string, () => React.JSX.Element> = {
  'true-size': TrueSizeArt,
  'border-sketch': BorderSketchArt,
  'flag-fault': FlagFaultArt,
  'warped-map': WarpedMapArt,
  'globe-cut': GlobeCutArt,
  'flag-painter': FlagPainterArt,
  'shadow-hunt': ShadowHuntArt,
  'sunset-chase': SunsetChaseArt,
  'quake-hunt': QuakeHuntArt,
  'nation-scales': NationScalesArt,
  'flag-mashup': FlagMashupArt,
  'border-chess': BorderChessArt,
  'border-go': BorderGoArt,
  diplomacy: DiplomacyArt,
  'new-world': NewWorldArt,
  elements: ElementsArt,
  'capital-pin': CapitalPinArt,
  silhouette: SilhouetteArt,
  'higher-lower': HigherLowerArt,
  'north-south': NorthSouthArt,
};

export function CardArt({ slug }: { slug: string }) {
  const Art = ARTS[slug];
  return <div className="card-art">{Art ? <Art /> : null}</div>;
}
