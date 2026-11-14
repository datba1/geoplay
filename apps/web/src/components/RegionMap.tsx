'use client';

import { useMemo, type ReactNode } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { Feature, Polygon } from 'geojson';
import { countryName, largestPolygon, type World } from '@/lib/geo';
import type { Region } from '@/lib/regions';
import { useI18n } from '@/lib/i18n';

export const MAP_W = 900;
export const MAP_H = 620;

interface Props {
  world: World;
  region: Region;
  codes: string[];
  fill: (a2: string) => string;
  stroke?: (a2: string) => string | undefined;
  onClick?: (a2: string) => void;
  label?: (a2: string) => ReactNode;
  /** Draw lines between neighbours (helps on small countries). */
  edges?: Map<string, string[]>;
}

export function useRegionGeometry(world: World, region: Region) {
  return useMemo(() => {
    const [w, s, e, n] = region.bbox;
    const box: Feature<Polygon> = {
      type: 'Feature', properties: {},
      geometry: { type: 'Polygon', coordinates: [[[w, s], [w, n], [e, n], [e, s], [w, s]]] },
    };
    const projection = geoMercator().fitExtent([[12, 12], [MAP_W - 12, MAP_H - 12]], box).clipExtent([[0, 0], [MAP_W, MAP_H]]);
    const path = geoPath(projection);
    const shapes = new Map<string, { d: string; c: [number, number] }>();
    for (const a2 of region.codes) {
      const c = world.byA2.get(a2);
      if (!c) continue;
      shapes.set(a2, { d: path(c.feature) ?? '', c: path.centroid(largestPolygon(c.feature)) as [number, number] });
    }
    const context = world.countries
      .filter((c) => !region.codes.includes(c.a2))
      .map((c) => ({ a2: c.a2, d: path(c.feature) ?? '' }))
      .filter((c) => c.d);
    return { shapes, path, projection, context };
  }, [world, region]);
}

export function RegionMap({ world, region, codes, fill, stroke, onClick, label, edges }: Props) {
  const { lang } = useI18n();
  const { shapes, context } = useRegionGeometry(world, region);
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ display: 'block', width: '100%', height: 'auto' }}>
      {context.map((c) => <path key={`ctx-${c.a2}`} d={c.d} fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />)}
      {edges && (
        <g stroke="rgba(255,255,255,0.12)" strokeWidth={1}>
          {[...edges].flatMap(([a, ns]) =>
            ns.filter((b) => a < b).map((b) => {
              const p = shapes.get(a)?.c, q = shapes.get(b)?.c;
              return p && q ? <line key={`${a}-${b}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} strokeDasharray="2 4" /> : null;
            }),
          )}
        </g>
      )}
      {codes.map((a2) => {
        const s = shapes.get(a2);
        if (!s) return null;
        return (
          <path
            key={a2}
            d={s.d}
            fill={fill(a2)}
            stroke={stroke?.(a2) ?? 'rgba(7,11,20,0.9)'}
            strokeWidth={stroke?.(a2) ? 2.2 : 0.8}
            style={{ cursor: onClick ? 'pointer' : 'default', transition: 'fill 0.25s' }}
            onClick={() => onClick?.(a2)}
          >
            <title>{countryName(a2, lang)}</title>
          </path>
        );
      })}
      {label && codes.map((a2) => {
        const s = shapes.get(a2);
        const content = label(a2);
        if (!s || content === null || content === undefined) return null;
        return (
          <g key={`l-${a2}`} transform={`translate(${s.c[0]},${s.c[1]})`} style={{ pointerEvents: onClick ? 'none' : 'auto' }}>
            {content}
          </g>
        );
      })}
    </svg>
  );
}
