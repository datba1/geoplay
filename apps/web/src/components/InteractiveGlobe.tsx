'use client';

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { geoContains, geoGraticule10, geoOrthographic, geoPath, type GeoPath, type GeoProjection } from 'd3-geo';
import type { World } from '@/lib/geo';
import { IslandMarks } from './IslandMarks';

interface Props {
  world: World;
  size?: number;
  rotation: [number, number];
  onRotate: (r: [number, number]) => void;
  fill: (a2: string) => string;
  stroke?: string;
  /** Called on a click (not a drag) with the geographic point and the country under it. */
  onPick?: (lonLat: [number, number], a2: string | null) => void;
  overlay?: (path: GeoPath, projection: GeoProjection) => ReactNode;
}

export function countryAt(world: World, p: [number, number]) {
  return world.countries.find((c) => geoContains(c.feature, p))?.a2 ?? null;
}

/** Orthographic SVG globe: drag to spin, click to pick. */
export function InteractiveGlobe({ world, size = 560, rotation, onRotate, fill, stroke, onPick, overlay }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; rot: [number, number]; moved: boolean } | null>(null);
  const [grabbing, setGrabbing] = useState(false);

  const projection = useMemo(
    () => geoOrthographic().scale(size * 0.46).translate([size / 2, size / 2]).clipAngle(90).rotate([rotation[0], rotation[1], 0]),
    [size, rotation],
  );
  const path = useMemo(() => geoPath(projection), [projection]);
  const graticule = useMemo(() => geoGraticule10(), []);

  const toLocal = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * size, ((e.clientY - r.top) / r.height) * size] as [number, number];
  };

  const down = (e: React.PointerEvent) => {
    svgRef.current!.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, rot: rotation, moved: false };
    setGrabbing(true);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    if (!d.moved) return;
    const k = 0.32 * (560 / size);
    onRotate([d.rot[0] + dx * k, Math.max(-85, Math.min(85, d.rot[1] - dy * k))]);
  };
  const up = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    setGrabbing(false);
    if (!d || d.moved || !onPick) return;
    const p = projection.invert?.(toLocal(e));
    if (!p) return;
    // invert() also returns points on the hidden hemisphere; ignore clicks outside the disc.
    const [x, y] = toLocal(e);
    if (Math.hypot(x - size / 2, y - size / 2) > size * 0.46) return;
    onPick(p as [number, number], countryAt(world, p as [number, number]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projection, onPick, world, size]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block', width: '100%', maxWidth: size, margin: '0 auto', touchAction: 'none', cursor: grabbing ? 'grabbing' : 'grab' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => { drag.current = null; setGrabbing(false); }}
    >
      <defs>
        <radialGradient id="ig-sea" cx="38%" cy="32%">
          <stop offset="0" stopColor="#1e2a52" />
          <stop offset="1" stopColor="#0a0f22" />
        </radialGradient>
      </defs>
      <path d={path({ type: 'Sphere' }) ?? ''} fill="url(#ig-sea)" stroke="rgba(255,140,90,0.45)" />
      <path d={path(graticule) ?? ''} fill="none" stroke="rgba(255,255,255,0.05)" />
      {world.countries.map((c) => (
        <path key={c.a2} d={path(c.feature) ?? ''} fill={fill(c.a2)} stroke={stroke ?? 'rgba(7,11,20,0.75)'} strokeWidth={0.6} />
      ))}
      <IslandMarks projection={projection} fill={fill('VN')} radius={1.6} fontSize={9} />
      {overlay?.(path, projection)}
    </svg>
  );
}
