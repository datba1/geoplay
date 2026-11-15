'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MAP_H, MAP_W, type Nation, type Province } from '@/lib/founders/engine';
import { paintContinent } from '@/lib/founders/paint';


/**
 * Landmarks drawn like the vignettes on an old manuscript map: ink outlines with sepia washes,
 * standing straight on the land (local grid roughly 40×40, base line at y = 10).
 */
function LandmarkIcon({ p }: { p: Province }) {
  const lm = p.landmark!;
  const art = (() => {
    switch (lm.kind) {
      case 'cave':
        return (
          <>
            <path d="M-18 10 L-12 -4 L-6 -9 L1 -13 L8 -8 L14 -2 L18 10 Z" className="mv-rock" />
            <path d="M-6 10 C-6 1 -3 -3 0 -3 C3 -3 6 1 6 10 Z" className="mv-void" />
            <path d="M-12 -4 L-9 0 M8 -8 L10 -3 M-4 -9 L-2 -6 M13 3 L15 6" className="mv-hatch" />
          </>
        );
      case 'tree':
        return (
          <>
            <path d="M-3 10 C-2 4 -3 0 -6 -3 M3 10 C2 5 3 1 6 -2 M0 10 V0" className="mv-trunk" />
            <path d="M0 -20 C7 -20 12 -15 12 -9 C16 -8 17 -2 13 1 C11 5 4 5 1 2 C-2 5 -9 5 -12 1 C-17 -1 -15 -8 -11 -9 C-11 -15 -6 -20 0 -20 Z" className="mv-leaf" />
            <path d="M-6 -12 q3 -3 6 0 M2 -8 q3 -3 6 0 M-9 -4 q3 -2 5 0" className="mv-hatch" />
          </>
        );
      case 'ruins':
        return (
          <>
            <path d="M-17 10 V-6 H-13 V-10 H-9 V-6 H-6 V10 Z" className="mv-stone" />
            <path d="M-3 10 V-2 C-3 -7 4 -7 4 -2 V10" className="mv-arch" />
            <path d="M7 10 V-4 L10 -8 L12 -3 L14 -6 V10 Z" className="mv-stone" />
            <path d="M-15 0 H-8 M-15 4 H-8 M8 2 H13" className="mv-hatch" />
            <path d="M-20 10 H18" className="mv-ground" />
          </>
        );
      case 'dragon':
        // an original winged dragon, coiled over its hoard
        return (
          <>
            <path d="M-20 8 C-14 12 -6 10 -4 4 C-2 -1 4 -1 6 3 C8 8 14 8 16 4" className="mv-dragon-body" />
            <path d="M-2 1 L-14 -16 L-10 -6 L-6 -18 L-4 -6 L2 -17 L1 0 Z" className="mv-dragon-wing" />
            <path d="M16 4 C17 0 16 -4 13 -6 L18 -8 L21 -5 L17 -3" className="mv-dragon-body" />
            <path d="M14 -7 L13 -11 M17 -8 L18 -12" className="mv-ink" />
            <path d="M-20 8 L-25 6 L-22 10 Z" className="mv-dragon-wing" />
            <path d="M-7 10 h3 M-1 11 h3 M5 10 h3" className="mv-gold" />
          </>
        );
      case 'shrine':
        return (
          <>
            <path d="M-12 10 V-1 H6 V10 Z" className="mv-stone" />
            <path d="M-14 -1 L-3 -9 L8 -1 Z" className="mv-roof" />
            <path d="M6 10 V-10 H12 V10 Z" className="mv-stone" />
            <path d="M5 -10 L9 -19 L13 -10 Z" className="mv-roof" />
            <path d="M-5 10 V4 C-5 2 -1 2 -1 4 V10" className="mv-void" />
            <path d="M9 -6 V-3" className="mv-ink" />
          </>
        );
      case 'oasis':
        return (
          <>
            <ellipse cx="0" cy="8" rx="15" ry="4" className="mv-water" />
            <path d="M-4 7 C-4 0 -3 -6 -1 -10 M5 7 C5 2 6 -3 8 -6" className="mv-trunk" />
            <path d="M-1 -10 C-6 -13 -11 -11 -13 -7 M-1 -10 C3 -14 8 -13 9 -9 M-1 -10 C-2 -15 1 -17 4 -16 M8 -6 C11 -9 15 -8 16 -5 M8 -6 C6 -10 9 -12 12 -11" className="mv-palm" />
          </>
        );
      default:
        return (
          <>
            <path d="M-6 10 L-4 -10 H4 L6 10 Z" className="mv-stone" />
            <path d="M-5 -2 H5 M-5.5 4 H5.5" className="mv-hatch" />
            <path d="M-6 -10 H6 V-13 H-6 Z" className="mv-roof" />
            <path d="M0 -14 C-4 -18 -1 -22 0 -25 C2 -21 4 -18 0 -14 Z" className="mv-flame" />
            <path d="M-12 10 H12" className="mv-ground" />
          </>
        );
    }
  })();
  return (
    <g transform={`translate(${p.cx + 18} ${p.cy - 10}) scale(${lm.kind === 'dragon' ? 1.35 : 1.05})`} className={`mv mv-${lm.kind} ${lm.looted ? 'looted' : ''}`}>
      <ellipse cx="0" cy="2" rx="22" ry="17" className="mv-halo" />
      {art}
    </g>
  );
}

/** A small castle in the realm's colours, used for capitals. */
function Castle({ x, y, color, children }: { x: number; y: number; color: string; children: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y})`} className="mv mv-castle" pointerEvents="none">
      <ellipse cx="0" cy="4" rx="30" ry="20" className="mv-halo" />
      <path d="M-20 14 V-2 H-16 V-6 H-13 V-2 H-10 V-6 H-7 V-2 H-3 V14 Z" className="mv-stone" />
      <path d="M3 14 V-2 H7 V-6 H10 V-2 H13 V-6 H16 V-2 H20 V14 Z" className="mv-stone" />
      <path d="M-8 14 V-12 H-5 V-16 H-2 V-12 H2 V-16 H5 V-12 H8 V14 Z" className="mv-stone" />
      <path d="M-3 14 V7 C-3 4 3 4 3 7 V14" className="mv-void" />
      <path d="M-14 4 h2 M12 4 h2 M-1 -6 h2" className="mv-ink" />
      <path d="M0 -16 V-30" className="mv-ink" />
      <g transform="translate(1 -31) scale(0.8)">{children}</g>
      <path d="M-20 14 H20" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/** Sea decorations: a sailing ship and an original sea serpent in the fog. */
function SeaDecor({ x0, y0, x1, y1 }: { x0: number; y0: number; x1: number; y1: number }) {
  return (
    <g className="mv mv-sea" pointerEvents="none">
      <g transform={`translate(${x1 + 40} ${y0 + 20})`}>
        <path d="M-22 6 C-14 14 14 14 22 6 Z" className="mv-hull" />
        <path d="M0 6 V-24" className="mv-ink" />
        <path d="M0 -22 C10 -18 12 -8 0 -2 Z" className="mv-sail" />
        <path d="M0 -20 C-8 -16 -9 -8 0 -4 Z" className="mv-sail" />
        <path d="M0 -24 L8 -26 L0 -28" className="mv-ink" />
        <path d="M-30 14 q6 -4 12 0 t12 0 M10 15 q6 -4 12 0" className="mv-wave" />
      </g>
      <g transform={`translate(${x0 - 40} ${y1 - 10})`}>
        <path d="M-30 4 C-24 -10 -16 -10 -12 2" className="mv-serpent" />
        <path d="M-6 4 C0 -12 8 -12 12 2" className="mv-serpent" />
        <path d="M18 4 C20 -8 26 -14 32 -10 L36 -12 L35 -7 L31 -6" className="mv-serpent" />
        <path d="M-34 8 q6 -4 12 0 t12 0 t12 0 t12 0 t12 0 t12 0" className="mv-wave" />
      </g>
    </g>
  );
}

function Compass({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="fm-compass">
      <circle r="46" fill="none" />
      <circle r="38" fill="none" strokeDasharray="2 4" />
      <path d="M0 -58 L8 -8 L0 0 Z" className="dark" />
      <path d="M0 -58 L-8 -8 L0 0 Z" className="light" />
      <path d="M0 58 L-8 8 L0 0 Z" className="dark" />
      <path d="M0 58 L8 8 L0 0 Z" className="light" />
      <path d="M58 0 L8 8 L0 0 Z" className="dark" />
      <path d="M58 0 L8 -8 L0 0 Z" className="light" />
      <path d="M-58 0 L-8 -8 L0 0 Z" className="dark" />
      <path d="M-58 0 L-8 8 L0 0 Z" className="light" />
      <text y="-64" textAnchor="middle">N</text>
    </g>
  );
}

interface View { k: number; x: number; y: number }

export interface FoundersMapProps {
  provinces: Province[];
  nations: Nation[];
  selected: number | null;
  onSelect: (p: Province) => void;
  /** Rendered on top of the capital of each nation. */
  renderFlag: (n: Nation) => ReactNode;
  /** Seeds the paint grain. */
  seed: number;
  children?: ReactNode;
}

export function FoundersMap({ provinces, nations, selected, onSelect, renderFlag, seed, children }: FoundersMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  // The visible window in map units: always matches the container's shape, so there are no empty bands.
  const [frame, setFrame] = useState({ ox: 0, oy: 0, vw: MAP_W, vh: MAP_H });
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const a = r.width / r.height;
      if (a > MAP_W / MAP_H) {
        const vw = MAP_H * a;
        setFrame({ ox: (vw - MAP_W) / 2, oy: 0, vw, vh: MAP_H });
      } else {
        const vh = MAP_W / a;
        setFrame({ ox: 0, oy: (vh - MAP_H) / 2, vw: MAP_W, vh });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  // The painted continent is drawn once per map, in the browser.
  const [painting, setPainting] = useState<string | null>(null);
  useEffect(() => {
    setPainting(paintContinent(provinces, seed));
  }, [provinces.length, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const paths = useMemo(() => provinces.map((p) => `M${p.poly.map((pt) => pt.join(',')).join('L')}Z`), [provinces.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const land = useMemo(() => paths.join(' '), [paths]);

  // Fit the continent on first render.
  const bounds = useMemo(() => {
    const xs = provinces.flatMap((p) => p.poly.map((q) => q[0]));
    const ys = provinces.flatMap((p) => p.poly.map((q) => q[1]));
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }, [provinces.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const fit = useCallback((): View => {
    const pad = 60;
    const k = Math.min(frame.vw / (bounds.x1 - bounds.x0 + pad * 2), frame.vh / (bounds.y1 - bounds.y0 + pad * 2));
    const cx = (bounds.x0 + bounds.x1) / 2;
    const cy = (bounds.y0 + bounds.y1) / 2;
    return { k, x: MAP_W / 2 - cx * k, y: MAP_H / 2 - cy * k };
  }, [bounds, frame]);

  useEffect(() => setView(fit()), [fit]);

  const clampView = useCallback((v: View): View => {
    const k = Math.max(fit().k * 0.9, Math.min(5, v.k));
    const margin = 200;
    const x = Math.min(frame.ox + margin, Math.max(MAP_W + frame.ox - MAP_W * k - margin, v.x));
    const y = Math.min(frame.oy + margin, Math.max(MAP_H + frame.oy - MAP_H * k - margin, v.y));
    return { k, x, y };
  }, [fit, frame]);

  /** Screen point → map coordinates, correct even when the map is letterboxed. */
  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const m = svg.getScreenCTM();
    if (!m) return [MAP_W / 2, MAP_H / 2];
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  };
  /** Screen pixels per map unit. */
  const pxPerUnit = () => svgRef.current!.getScreenCTM()?.a || 1;

  const zoomAt = useCallback((factor: number, sx = MAP_W / 2, sy = MAP_H / 2) => {
    setView((v) => {
      const k = v.k * factor;
      return clampView({ k, x: sx - ((sx - v.x) * k) / v.k, y: sy - ((sy - v.y) * k) / v.k });
    });
  }, [clampView]);

  // Wheel zoom needs a non-passive listener.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const [sx, sy] = toSvg(e.clientX, e.clientY);
      zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, sx, sy);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const unit = pxPerUnit();
    const dx = (e.clientX - d.x) / unit;
    const dy = (e.clientY - d.y) / unit;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) {
      d.moved = true;
      svgRef.current!.setPointerCapture(e.pointerId);
    }
    if (d.moved) setView((v) => clampView({ ...v, x: d.vx + dx, y: d.vy + dy }));
  };
  const onPointerUp = () => {
    suppressClick.current = !!drag.current?.moved;
    drag.current = null;
  };

  const click = (p: Province) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onSelect(p);
  };

  const showNames = view.k >= fit().k * 1.45;
  const labelScale = 1 / Math.max(1, view.k / (fit().k * 1.45));

  return (
    <div className="fm">
      <svg
        ref={svgRef}
        viewBox={`${-frame.ox} ${-frame.oy} ${frame.vw} ${frame.vh}`}
        className={drag.current?.moved ? 'dragging' : ''}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <defs>
          <filter id="fm-paper" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
            <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.27  0 0 0 0 0.15  0 0 0 0.09 0" />
          </filter>
          <filter id="fm-fog" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="4" seed="11" />
            <feColorMatrix values="0 0 0 0 0.97  0 0 0 0 0.95  0 0 0 0 0.9  0 0 0 1.7 -0.55" />
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="fm-soft"><feGaussianBlur stdDeviation="14" /></filter>
          {/* fog only over the sea: the land (and a soft shore) is cut out */}
          <mask id="fm-sea" maskUnits="userSpaceOnUse" x={-frame.ox} y={-frame.oy} width={frame.vw} height={frame.vh}>
            <rect x={-frame.ox} y={-frame.oy} width={frame.vw} height={frame.vh} fill="#fff" />
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              <path d={land} fill="#000" stroke="#000" strokeWidth={36} strokeLinejoin="round" filter="url(#fm-soft)" />
            </g>
          </mask>
          <radialGradient id="fm-vignette" cx="50%" cy="50%" r="72%">
            <stop offset="0.55" stopColor="#f4ead0" stopOpacity="0" />
            <stop offset="1" stopColor="#efe5cc" stopOpacity="0.95" />
          </radialGradient>
        </defs>

        {/* parchment sea */}
        <rect x={-frame.ox} y={-frame.oy} width={frame.vw} height={frame.vh} fill="#e3d4ae" />
        <rect x={-frame.ox} y={-frame.oy} width={frame.vw} height={frame.vh} filter="url(#fm-paper)" />

        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {/* painted continent (half resolution, shown at full size) */}
          <SeaDecor x0={bounds.x0} y0={bounds.y0} x1={bounds.x1} y1={bounds.y1} />
          {painting && <image href={painting} x={0} y={0} width={MAP_W} height={MAP_H} preserveAspectRatio="none" style={{ imageRendering: 'auto' }} />}

          {/* realms */}
          {provinces.map((p, i) => p.owner !== null && (
            <path key={`o${p.id}`} d={paths[i]} fill={nations[p.owner].color} fillOpacity={p.owner === 0 ? 0.45 : 0.38} />
          ))}

          {/* province borders and click targets */}
          {provinces.map((p, i) => (
            <path key={`h${p.id}`} d={paths[i]} className="fm-prov" onClick={() => click(p)} fill="transparent" stroke="rgba(70,55,35,0.32)" strokeWidth={1.1} strokeDasharray="5 4" />
          ))}
          {provinces.map((p, i) => p.owner !== null && (
            <path key={`b${p.id}`} d={paths[i]} fill="none" stroke={nations[p.owner].color} strokeWidth={p.owner === 0 ? 3.2 : 2.6} strokeOpacity={0.95} pointerEvents="none" />
          ))}


          {/* landmarks */}
          <g pointerEvents="none">{provinces.filter((p) => p.landmark).map((p) => <LandmarkIcon key={`l${p.id}`} p={p} />)}</g>

          {selected !== null && (
            <path d={paths[selected]} fill="rgba(255,250,230,0.18)" stroke="#2b1d10" strokeWidth={3.5} strokeDasharray="8 5" pointerEvents="none" />
          )}

          {/* names */}
          <g pointerEvents="none">
            {provinces.map((p) => {
              const cap = nations.find((n) => n.alive && n.capital === p.id);
              if (!showNames && !cap) return null;
              return (
                <text key={`t${p.id}`} x={p.cx} y={p.cy + 20} className={cap ? 'fm-name fm-capital' : 'fm-name'} textAnchor="middle"
                  style={{ fontSize: (cap ? 15 : 12) * labelScale }}>
                  {p.name}
                </text>
              );
            })}
          </g>

          {/* capitals: castles flying the realm's banner */}
          {nations.filter((n) => n.alive && n.capital >= 0).map((n) => {
            const c = provinces[n.capital];
            return (
              <Castle key={`c${n.id}`} x={c.cx} y={c.cy - 16} color={n.color}>
                {renderFlag(n)}
              </Castle>
            );
          })}
        </g>

        {/* drifting fog over the open sea and a soft vignette */}
        <g mask="url(#fm-sea)" pointerEvents="none">
          <rect x={-frame.ox} y={-frame.oy} width={frame.vw} height={frame.vh} fill="url(#fm-vignette)" />
          <rect x={-frame.ox - 60} y={-frame.oy} width={frame.vw + 120} height={frame.vh} filter="url(#fm-fog)" className="fm-fog" />
        </g>
        <Compass x={-frame.ox + 100} y={-frame.oy + frame.vh - 100} />
      </svg>

      <div className="fm-zoom">
        <button onClick={() => zoomAt(1.35)} aria-label="Zoom in">+</button>
        <button onClick={() => zoomAt(1 / 1.35)} aria-label="Zoom out">−</button>
        <button onClick={() => setView(fit())} aria-label="Reset view">⌂</button>
      </div>
      {children}
    </div>
  );
}
