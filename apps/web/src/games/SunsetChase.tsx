'use client';

import { useEffect, useRef, useState } from 'react';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { useI18n } from '@/lib/i18n';
import { addGameText } from '@/lib/gameText';
import { loadWorld, type World } from '@/lib/geo';
import { mulberry32 } from '@/lib/rng';
import { GameShell, type GameContext } from '@/components/GameShell';

addGameText({
  en: { 'sc.date': 'Date', 'sc.inBand': 'In the golden band', 'sc.outBand': 'Out of the band', 'sc.elev': 'Sun elevation', 'sc.start': 'Take off', 'sc.time': 'Flight time' },
  vi: { 'sc.date': 'Ngày', 'sc.inBand': 'Trong dải hoàng hôn', 'sc.outBand': 'Ngoài dải', 'sc.elev': 'Độ cao mặt trời', 'sc.start': 'Cất cánh', 'sc.time': 'Thời gian bay' },
});

const W = 960;
const H = 480;
const DURATION = 60;
const SIM_MIN_PER_SEC = 4; // band drifts 1° of longitude per real second
const SPEED = 1.7; // degrees per second (great-circle equivalent)
const BAND_LOW = -6;
const BAND_HIGH = 4;
const D2R = Math.PI / 180;

const declination = (day: number) => -23.44 * Math.cos(((2 * Math.PI) / 365) * (day + 10));

function elevation(lat: number, lon: number, decl: number, subLon: number) {
  let h = lon - subLon;
  h = ((h + 540) % 360) - 180;
  const s = Math.sin(lat * D2R) * Math.sin(decl * D2R) + Math.cos(lat * D2R) * Math.cos(decl * D2R) * Math.cos(h * D2R);
  return { el: Math.asin(Math.max(-1, Math.min(1, s))) / D2R, h };
}

const x = (lon: number) => ((lon + 180) / 360) * W;
const y = (lat: number) => ((90 - lat) / 180) * H;

export function SunsetChase({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [running, setRunning] = useState(false);
  const [hud, setHud] = useState({ time: DURATION, score: 0, inBand: false, el: 0 });
  const keys = useRef(new Set<string>());
  const pointer = useRef<[number, number] | null>(null);
  const finished = useRef(false);

  // Seeded setup: a date (season) and a start point.
  const setup = useRef<{ day: number; decl: number; lat: number; lon: number } | null>(null);
  if (!setup.current) {
    const r = mulberry32(ctx.seed);
    const day = 1 + Math.floor(r() * 365);
    setup.current = { day, decl: declination(day), lat: -30 + r() * 80, lon: -150 + r() * 300 };
  }
  const { day, decl } = setup.current;
  const dateLabel = new Date(Date.UTC(2026, 0, day)).toLocaleDateString(lang, { day: 'numeric', month: 'long' });

  useEffect(() => { loadWorld().then(setWorld); }, []);

  useEffect(() => {
    if (!world) return;
    const canvas = canvasRef.current!;
    const c = canvas.getContext('2d')!;
    // Pre-render the base map once.
    const base = document.createElement('canvas');
    base.width = W; base.height = H;
    const b = base.getContext('2d')!;
    b.fillStyle = '#0d1630'; b.fillRect(0, 0, W, H);
    const proj = geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]);
    b.beginPath(); geoPath(proj, b)(world.land); b.fillStyle = '#2b3b63'; b.fill();
    b.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let lon = -180; lon <= 180; lon += 30) { b.beginPath(); b.moveTo(x(lon), 0); b.lineTo(x(lon), H); b.stroke(); }
    for (let lat = -60; lat <= 60; lat += 30) { b.beginPath(); b.moveTo(0, y(lat)); b.lineTo(W, y(lat)); b.stroke(); }

    const s = setup.current!;
    // Choose UTC so the start point sits inside the sunset band (sun ~1° below horizon, afternoon side).
    const cosH = (Math.sin(-1 * D2R) - Math.sin(s.lat * D2R) * Math.sin(decl * D2R)) / (Math.cos(s.lat * D2R) * Math.cos(decl * D2R));
    const h0 = Math.acos(Math.max(-1, Math.min(1, cosH))) / D2R;
    let subLon = s.lon - h0;
    const plane = { lat: s.lat, lon: s.lon, heading: -90 };
    let score = 0;
    let time = DURATION;
    let last = performance.now();
    let raf = 0;
    let hudTick = 0;

    const draw = (now: number) => {
      const dt = running ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      if (running) {
        time = Math.max(0, time - dt);
        subLon -= (SIM_MIN_PER_SEC / 60) * 15 * dt; // the sun moves west 15°/hour
        // steering
        let vx = 0, vy = 0;
        const k = keys.current;
        if (k.has('ArrowLeft') || k.has('a')) vx -= 1;
        if (k.has('ArrowRight') || k.has('d')) vx += 1;
        if (k.has('ArrowUp') || k.has('w')) vy += 1;
        if (k.has('ArrowDown') || k.has('s')) vy -= 1;
        if (pointer.current) {
          const [plon, plat] = pointer.current;
          let dlon = ((plon - plane.lon + 540) % 360) - 180;
          vx = dlon; vy = plat - plane.lat;
        }
        const len = Math.hypot(vx, vy);
        if (len > 0.01) {
          const cosLat = Math.max(0.2, Math.cos(plane.lat * D2R));
          plane.lon += ((vx / len) * SPEED * dt) / cosLat;
          plane.lat = Math.max(-80, Math.min(80, plane.lat + (vy / len) * SPEED * dt));
          plane.lon = ((plane.lon + 540) % 360) - 180;
          plane.heading = (Math.atan2(-vy, vx) * 180) / Math.PI;
        }
      }
      const sun = elevation(plane.lat, plane.lon, decl, subLon);
      const inBand = sun.el >= BAND_LOW && sun.el <= BAND_HIGH && sun.h > 0;
      if (running && inBand) score += dt * 10;

      // draw
      c.drawImage(base, 0, 0);
      const cell = 8;
      for (let py = 0; py < H; py += cell) {
        const lat = 90 - ((py + cell / 2) / H) * 180;
        for (let px = 0; px < W; px += cell) {
          const lon = ((px + cell / 2) / W) * 360 - 180;
          const e = elevation(lat, lon, decl, subLon);
          if (e.el >= BAND_LOW && e.el <= BAND_HIGH && e.h > 0) {
            c.fillStyle = `rgba(255,170,80,${0.45 - Math.abs(e.el + 1) * 0.04})`;
            c.fillRect(px, py, cell, cell);
          } else if (e.el < 0) {
            c.fillStyle = `rgba(3,5,14,${Math.min(0.72, 0.3 + -e.el / 30)})`;
            c.fillRect(px, py, cell, cell);
          }
        }
      }
      // subsolar point
      const sx = x(((subLon + 540) % 360) - 180), sy = y(decl);
      c.beginPath(); c.arc(sx, sy, 9, 0, Math.PI * 2); c.fillStyle = '#ffd36b'; c.fill();
      // plane
      c.save();
      c.translate(x(plane.lon), y(plane.lat));
      c.rotate((plane.heading * Math.PI) / 180);
      c.beginPath(); c.moveTo(12, 0); c.lineTo(-8, -8); c.lineTo(-4, 0); c.lineTo(-8, 8); c.closePath();
      c.fillStyle = inBand ? '#4fd1a1' : '#ffffff'; c.fill();
      c.restore();

      hudTick += dt;
      if (hudTick > 0.1 || !running) {
        hudTick = 0;
        setHud({ time, score: Math.round(score), inBand, el: sun.el });
      }
      if (running && time <= 0 && !finished.current) {
        finished.current = true;
        const pts = Math.round(score);
        ctx.finish({ points: pts, stamps: [], meta: { day } }, { score: String(pts), subtitle: `${Math.round(score / 10)}s` });
        return;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [world, running, decl, day, ctx]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
      keys.current.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const toLonLat = (e: React.PointerEvent): [number, number] => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 360 - 180, 90 - ((e.clientY - r.top) / r.height) * 180];
  };

  return (
    <div className="game-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) 240px' }}>
      <div className="board">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ display: 'block', width: '100%', height: 'auto', touchAction: 'none', cursor: 'crosshair' }}
          onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); pointer.current = toLonLat(e); }}
          onPointerMove={(e) => { if (pointer.current) pointer.current = toLonLat(e); }}
          onPointerUp={() => (pointer.current = null)}
          onPointerCancel={() => (pointer.current = null)}
        />
        {!running && world && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(3,5,14,0.45)' }}>
            <button className="btn btn-primary" onClick={() => setRunning(true)}>✈️ {t('sc.start')}</button>
          </div>
        )}
      </div>
      <aside className="side">
        <div className="stat-box"><small>{t('sc.date')}</small><b style={{ fontSize: 15 }}>{dateLabel}</b></div>
        <div className="stat-box"><small>{t('sc.time')}</small><b>{hud.time.toFixed(1)}s</b></div>
        <div className="stat-box"><small>{t('common.score')}</small><b>{hud.score}</b></div>
        <div className="stat-box"><small>{t('sc.elev')}</small><b>{hud.el.toFixed(1)}°</b></div>
        <p className={hud.inBand ? 'pill-good' : 'pill-bad'} style={{ fontWeight: 600, textAlign: 'center' }}>
          {hud.inBand ? t('sc.inBand') : t('sc.outBand')}
        </p>
      </aside>
    </div>
  );
}

export function SunsetChasePage() {
  return (
    <GameShell slug="sunset-chase" rules={['sc.rules.1', 'sc.rules.2', 'sc.rules.3']}>
      {(ctx) => <SunsetChase key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
