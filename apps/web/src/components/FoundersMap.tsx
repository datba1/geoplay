'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MAP_H, MAP_W, type Nation, type Province } from '@/lib/founders/engine';
import { paintContinent } from '@/lib/founders/paint';

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
    const k = Math.min(MAP_W / (bounds.x1 - bounds.x0 + pad * 2), MAP_H / (bounds.y1 - bounds.y0 + pad * 2));
    const cx = (bounds.x0 + bounds.x1) / 2;
    const cy = (bounds.y0 + bounds.y1) / 2;
    return { k, x: MAP_W / 2 - cx * k, y: MAP_H / 2 - cy * k };
  }, [bounds]);

  useEffect(() => setView(fit()), [fit]);

  const clampView = useCallback((v: View): View => {
    const k = Math.max(fit().k * 0.9, Math.min(5, v.k));
    const margin = 200;
    const x = Math.min(margin, Math.max(MAP_W - MAP_W * k - margin, v.x));
    const y = Math.min(margin, Math.max(MAP_H - MAP_H * k - margin, v.y));
    return { k, x, y };
  }, [fit]);

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
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
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
          <mask id="fm-sea" maskUnits="userSpaceOnUse" x="0" y="0" width={MAP_W} height={MAP_H}>
            <rect width={MAP_W} height={MAP_H} fill="#fff" />
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
        <rect width={MAP_W} height={MAP_H} fill="#e3d4ae" />
        <rect width={MAP_W} height={MAP_H} filter="url(#fm-paper)" />

        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {/* painted continent (half resolution, shown at full size) */}
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

          {/* capital banners */}
          {nations.filter((n) => n.alive && n.capital >= 0).map((n) => {
            const c = provinces[n.capital];
            return (
              <g key={`c${n.id}`} transform={`translate(${c.cx - 2} ${c.cy - 40})`} pointerEvents="none">
                <path d="M0 0v36" stroke="#2b1d10" strokeWidth="2" />
                <circle cx="0" cy="36" r="3" fill="#2b1d10" />
                <g transform="translate(1 0)">{renderFlag(n)}</g>
              </g>
            );
          })}
        </g>

        {/* drifting fog over the open sea and a soft vignette */}
        <g mask="url(#fm-sea)" pointerEvents="none">
          <rect width={MAP_W} height={MAP_H} fill="url(#fm-vignette)" />
          <rect width={MAP_W} height={MAP_H} filter="url(#fm-fog)" className="fm-fog" />
        </g>
        <Compass x={110} y={MAP_H - 110} />
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
