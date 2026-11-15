'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { addGameText } from '@/lib/gameText';
import { countryName, flagUrl } from '@/lib/geo';
import { hsl, rgbToHsl, visibleFilledShapes } from '@/lib/flagsvg';
import { mulberry32, shuffle } from '@/lib/rng';
import { GameShell, type GameContext } from '@/components/GameShell';

addGameText({
  en: { 'fp.paint': 'Paint the flag of', 'fp.pick': 'Tap an area of the flag', 'fp.choose': 'Choose the official shade', 'fp.check': 'Check', 'fp.left': '{n} areas left', 'fp.result': '{ok} / {all} areas correct', 'fp.flag': 'Flag' },
  vi: { 'fp.paint': 'Tô lá cờ', 'fp.pick': 'Chạm vào một vùng của lá cờ', 'fp.choose': 'Chọn sắc màu chính thức', 'fp.check': 'Kiểm tra', 'fp.left': 'Còn {n} vùng', 'fp.result': 'Đúng {ok} / {all} vùng', 'fp.flag': 'Lá cờ' },
});

const POOL = ['VN', 'FR', 'DE', 'IT', 'JP', 'PL', 'UA', 'IE', 'BE', 'NL', 'AT', 'SE', 'NO', 'DK', 'FI', 'CH', 'TR', 'TH', 'LA',
  'BD', 'NG', 'CL', 'CU', 'CZ', 'EE', 'LT', 'HU', 'RO', 'BG', 'CA', 'GH', 'ML', 'SN', 'CM', 'GN', 'CI', 'ID', 'MC', 'LV', 'CO'];
const ROUNDS = 5;
const MAX_AREAS = 8;
const BLANK = '#e8e6e1';

interface Area { el: SVGGeometryElement; truth: string; shades: string[]; chosen: string | null }

/** Five near-identical options for one official colour (the true one included). */
function shadesFor([r, g, b]: [number, number, number], rand: () => number, spread = 1, count = 4): { truth: string; shades: string[] } {
  const truth = `rgb(${r}, ${g}, ${b})`;
  const [h, s, l] = rgbToHsl(r, g, b);
  const variants: string[] = [];
  if (s < 0.12 && l > 0.85) {
    variants.push('#f6f0dc', '#eef1f6', '#f3ece6', '#e9ecef');
  } else if (s < 0.15 && l < 0.2) {
    variants.push('#1c1f26', '#2a2320', '#151a22', '#262626');
  } else {
    const deltas: [number, number, number][] = [[10, 0, 0.04], [-10, 0.05, -0.04], [4, -0.15, 0.07], [-5, 0.1, -0.08], [14, 0.08, 0.02], [-14, -0.08, 0.05]];
    for (const [dh, ds, dl] of shuffle(deltas, rand).slice(0, count)) variants.push(hsl(h + dh * spread, s + ds * spread, l + dl * spread));
  }
  return { truth, shades: shuffle([truth, ...variants.slice(0, count)], rand) };
}

export function FlagPainter({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  // Easy: three clearly different shades. Hard: five very close ones.
  const SPREAD = ctx.pick(2.2, 1, 0.6);
  const SHADES = ctx.pick(2, 4, 4);
  const [order] = useState(() => shuffle(POOL, mulberry32(ctx.seed)));
  const rand = useRef(mulberry32(ctx.seed ^ 0x51ed));
  const [cursor, setCursor] = useState(0);
  const [round, setRound] = useState(0);
  const [svgText, setSvgText] = useState<string | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState<{ ok: number; all: number } | null>(null);
  const [score, setScore] = useState(0);
  const [stamps, setStamps] = useState<string[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const a2 = order[cursor % order.length];

  useEffect(() => {
    let cancelled = false;
    setSvgText(null);
    fetch(flagUrl(a2)).then((r) => r.text()).then((txt) => !cancelled && setSvgText(txt));
    return () => { cancelled = true; };
  }, [a2]);

  useLayoutEffect(() => {
    if (!svgText || !stageRef.current) return;
    const holder = stageRef.current.querySelector('.flag-svg')!;
    holder.innerHTML = svgText;
    const found = visibleFilledShapes(stageRef.current, 0.004);
    if (found.length < 2 || found.length > MAX_AREAS) { setCursor((c) => c + 1); return; }
    const list = found.map(({ el, color }, i) => {
      const { truth, shades } = shadesFor(color, rand.current, SPREAD, SHADES);
      el.style.fill = BLANK;
      el.style.stroke = '#1a1d26';
      el.style.strokeWidth = '1.5px';
      el.style.setProperty('vector-effect', 'non-scaling-stroke');
      el.style.cursor = 'pointer';
      el.dataset.area = String(i);
      return { el, truth, shades, chosen: null };
    });
    setAreas(list);
    setSelected(0);
    setChecked(null);
  }, [svgText]); // eslint-disable-line react-hooks/exhaustive-deps

  const onStageClick = (e: React.MouseEvent) => {
    if (checked) return;
    const target = (e.target as Element).closest('[data-area]') as HTMLElement | null;
    if (target) setSelected(Number(target.dataset.area));
  };

  const choose = (shade: string) => {
    if (selected === null || checked) return;
    areas[selected].el.style.fill = shade;
    const next = areas.map((a, i) => (i === selected ? { ...a, chosen: shade } : a));
    setAreas(next);
    const firstEmpty = next.findIndex((a) => !a.chosen);
    setSelected(firstEmpty === -1 ? selected : firstEmpty);
  };

  useEffect(() => {
    areas.forEach((a, i) => {
      a.el.style.strokeWidth = i === selected && !checked ? '4px' : '1.5px';
      a.el.style.stroke = checked ? (a.chosen === a.truth ? '#4fd1a1' : '#ff5d6c') : i === selected ? '#ff7a50' : '#1a1d26';
    });
  }, [selected, areas, checked]);

  const check = () => {
    const ok = areas.filter((a) => a.chosen === a.truth).length;
    setChecked({ ok, all: areas.length });
    setScore((s) => s + Math.round((200 * ok) / areas.length));
    if (ok === areas.length) setStamps((s) => [...s, a2]);
    ctx.hit(ok === areas.length);
    // reveal true colours on the wrong areas
    setTimeout(() => areas.forEach((a) => (a.el.style.fill = a.truth)), 900);
  };

  const next = () => {
    if (round + 1 >= ROUNDS) {
      ctx.finish({ points: score, stamps, meta: {} }, { score: String(score) });
      return;
    }
    setRound((r) => r + 1);
    setCursor((c) => c + 1);
  };

  const left = areas.filter((a) => !a.chosen).length;
  const current = selected !== null ? areas[selected] : null;

  return (
    <div className="game-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) 280px' }}>
      <div className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <span className="muted">{t('fp.paint')}</span>
          <h2 style={{ fontSize: 30 }}>{countryName(a2, lang)}</h2>
        </div>
        <div ref={stageRef} className="flag-stage" style={{ cursor: 'pointer', opacity: areas.length ? 1 : 0 }} onClick={onStageClick}>
          <div className="flag-svg" style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
      <aside className="side">
        <div className="row">
          <div className="stat-box" style={{ flex: 1 }}><small>{t('fp.flag')}</small><b>{round + 1} / {ROUNDS}</b></div>
          <div className="stat-box" style={{ flex: 1 }}><small>{t('common.score')}</small><b>{score}</b></div>
        </div>
        <div className="card">
          <span className="eyebrow">{current ? t('fp.choose') : t('fp.pick')}</span>
          <div className="swatches">
            {current?.shades.map((s) => (
              <button
                key={s}
                className={`swatch ${current.chosen === s ? 'on' : ''} ${checked && s === current.truth ? 'truth' : ''}`}
                style={{ background: s }}
                onClick={() => choose(s)}
                disabled={!!checked}
                aria-label={s}
              />
            ))}
          </div>
          {!checked && <p className="small muted">{t('fp.left', { n: left })}</p>}
          {checked ? (
            <>
              <p><b className={checked.ok === checked.all ? 'pill-good' : 'pill-bad'}>{t('fp.result', checked)}</b></p>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={next}>{t('common.next')} →</button>
            </>
          ) : (
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={left > 0} onClick={check}>{t('fp.check')}</button>
          )}
        </div>
      </aside>
    </div>
  );
}

export function FlagPainterPage() {
  return (
    <GameShell slug="flag-painter" rules={['fp.rules.1', 'fp.rules.2', 'fp.rules.3']}>
      {(ctx) => <FlagPainter key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
