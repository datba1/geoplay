'use client';

import { geoPath, type GeoProjection } from 'd3-geo';
import { ARCHIPELAGOS, islandName } from '@/lib/islands';
import { useI18n } from '@/lib/i18n';

interface Props {
  projection: GeoProjection;
  fill: string;
  radius?: number;
  labels?: boolean;
  fontSize?: number;
}

/**
 * Draws the Paracel (Hoàng Sa) and Spratly (Trường Sa) islands on any SVG map.
 * geoPath clips points on the far side of a globe automatically.
 */
export function IslandMarks({ projection, fill, radius = 1.8, labels = true, fontSize = 10 }: Props) {
  const { lang } = useI18n();
  const path = geoPath(projection).pointRadius(radius);
  return (
    <g style={{ pointerEvents: 'none' }}>
      {ARCHIPELAGOS.map((a) => {
        const dots = path({ type: 'MultiPoint', coordinates: a.points });
        if (!dots) return null;
        const visible = !!geoPath(projection)({ type: 'Point', coordinates: a.label });
        const xy = projection(a.label);
        return (
          <g key={a.id}>
            <path d={dots} fill={fill} stroke="rgba(7,11,20,0.6)" strokeWidth={0.4} />
            {labels && visible && xy && (
              <text
                x={xy[0] + radius * 3}
                y={xy[1]}
                fontSize={fontSize}
                fill="rgba(255,255,255,0.75)"
                stroke="rgba(7,11,20,0.85)"
                strokeWidth={2.5}
                paintOrder="stroke"
              >
                {islandName(a, lang)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
