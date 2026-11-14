'use client';

import { useEffect, useRef, useState } from 'react';
import { geoContains, geoOrthographic, geoPath, geoGraticule10 } from 'd3-geo';
import { loadWorld } from '@/lib/geo';
import { ARCHIPELAGOS } from '@/lib/islands';

/** Rotating dotted globe drawn on canvas. Drag to spin it. */
export function Globe({ size = 380 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [coords, setCoords] = useState<[number, number]>([105.8, 18]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const r = size * 0.36;
    const projection = geoOrthographic().scale(r).translate([size / 2, size / 2]).clipAngle(90).precision(0.5);
    const path = geoPath(projection, ctx);
    const graticule = geoGraticule10();
    let dots: [number, number][] = [];
    let rotation: [number, number] = [-105.8, -18];
    let dragging: { x: number; y: number; rot: [number, number] } | null = null;
    let raf = 0;
    let alive = true;
    let lastCoordUpdate = 0;

    loadWorld().then((world) => {
      if (!alive) return;
      // Sample land on a lat/lon grid (denser in longitude near the equator).
      const pts: [number, number][] = [];
      const step = 2.4;
      for (let lat = -84; lat <= 84; lat += step) {
        const lonStep = step / Math.max(0.25, Math.cos((lat * Math.PI) / 180));
        for (let lon = -180; lon < 180; lon += lonStep) {
          if (geoContains(world.land, [lon, lat])) pts.push([lon, lat]);
        }
      }
      // Island groups too small for the 1:110m land data.
      for (const a of ARCHIPELAGOS) pts.push(...a.points);
      dots = pts;
    });

    const draw = (time: number) => {
      if (!dragging) rotation = [rotation[0] + 0.12, rotation[1]];
      projection.rotate(rotation);
      ctx.clearRect(0, 0, size, size);

      // glow
      const glow = ctx.createRadialGradient(size / 2, size / 2, r * 0.9, size / 2, size / 2, r * 1.35);
      glow.addColorStop(0, 'rgba(255,122,80,0.28)');
      glow.addColorStop(1, 'rgba(255,122,80,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      // sphere
      const sphere = ctx.createRadialGradient(size / 2 - r * 0.35, size / 2 - r * 0.4, r * 0.1, size / 2, size / 2, r);
      sphere.addColorStop(0, '#1d2448');
      sphere.addColorStop(1, '#0a0e1f');
      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.fillStyle = sphere;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,140,90,0.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      path(graticule);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // land dots
      const center: [number, number] = [-rotation[0], -rotation[1]];
      for (const p of dots) {
        const xy = projection(p);
        if (!xy) continue;
        // hide dots on the far side
        const dLon = ((p[0] - center[0]) * Math.PI) / 180;
        const lat1 = (center[1] * Math.PI) / 180;
        const lat2 = (p[1] * Math.PI) / 180;
        const cosC = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLon);
        if (cosC < 0.02) continue;
        ctx.fillStyle = `rgba(170,110,255,${0.35 + 0.65 * cosC})`;
        ctx.fillRect(xy[0] - 1.3, xy[1] - 1.3, 2.6, 2.6);
      }

      // orbit ring
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(-0.32);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.42, r * 0.42, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,178,107,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
      const a = time / 2200;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 1.42, Math.sin(a) * r * 0.42, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffb26b';
      ctx.fill();
      ctx.restore();

      if (time - lastCoordUpdate > 250) {
        lastCoordUpdate = time;
        let lon = ((center[0] + 540) % 360) - 180;
        setCoords([lon, center[1]]);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const down = (e: PointerEvent) => {
      dragging = { x: e.clientX, y: e.clientY, rot: [...rotation] as [number, number] };
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const k = 0.35;
      rotation = [
        dragging.rot[0] + (e.clientX - dragging.x) * k,
        Math.max(-70, Math.min(70, dragging.rot[1] - (e.clientY - dragging.y) * k)),
      ];
    };
    const up = () => (dragging = null);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
    };
  }, [size]);

  const fmt = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? pos : neg}`;

  return (
    <div className="globe-wrap">
      <canvas ref={canvasRef} style={{ width: size, height: size, maxWidth: '100%', cursor: 'grab', touchAction: 'none' }} />
      <div className="globe-coords">{fmt(coords[0], 'E', 'W')} · {fmt(coords[1], 'N', 'S')}</div>
    </div>
  );
}
