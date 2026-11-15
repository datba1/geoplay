'use client';

import { useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { addGameText } from '@/lib/gameText';
import { countryName, flagUrl } from '@/lib/geo';
import { mulberry32, shuffle } from '@/lib/rng';
import { GameShell, type GameContext } from '@/components/GameShell';

addGameText({
  en: { 'fm.which': 'Which flags were stitched together?', 'fm.pickN': 'Pick {n} countries', 'fm.confirm': 'Confirm', 'fm.result': '{ok} of {n} right', 'fm.sources': 'Sources:' },
  vi: { 'fm.which': 'Những lá cờ nào đã được ghép lại?', 'fm.pickN': 'Chọn {n} nước', 'fm.confirm': 'Xác nhận', 'fm.result': 'Đúng {ok} / {n}', 'fm.sources': 'Nguồn:' },
});

const POOL = ['VN', 'US', 'GB', 'FR', 'DE', 'IT', 'ES', 'PT', 'JP', 'KR', 'CN', 'BR', 'AR', 'CA', 'MX', 'AU', 'IN', 'TH', 'LA',
  'KH', 'MY', 'PH', 'SG', 'TR', 'GR', 'SE', 'NO', 'DK', 'FI', 'IE', 'NL', 'BE', 'CH', 'AT', 'PL', 'CZ', 'UA', 'ZA', 'EG',
  'NG', 'KE', 'SA', 'IL', 'PK', 'BD', 'CU', 'JM', 'CL', 'CO', 'PE', 'HU', 'RO', 'BG', 'CO', 'GH', 'ID', 'NZ', 'MN'];
const ROUNDS = 5;

type Layout = 'v2' | 'h2' | 'd2' | 'v3' | 'h3';
interface Round { sources: string[]; layout: Layout; options: string[] }

/** Clip polygons (in the 640×480 flag box) for each piece of a layout. */
const CLIPS: Record<Layout, string[]> = {
  v2: ['0,0 320,0 320,480 0,480', '320,0 640,0 640,480 320,480'],
  h2: ['0,0 640,0 640,240 0,240', '0,240 640,240 640,480 0,480'],
  d2: ['0,0 640,0 0,480', '640,0 640,480 0,480'],
  v3: ['0,0 214,0 214,480 0,480', '214,0 427,0 427,480 214,480', '427,0 640,0 640,480 427,480'],
  h3: ['0,0 640,0 640,160 0,160', '0,160 640,160 640,320 0,320', '0,320 640,320 640,480 0,480'],
};

function makeRounds(seed: number, layouts: Layout[], optionCount: number): Round[] {
  const rand = mulberry32(seed);
  const pool = shuffle([...new Set(POOL)], rand);
  let i = 0;
  return shuffle(layouts, rand).map((layout) => {
    const n = CLIPS[layout].length;
    const sources = pool.slice(i, i + n);
    i += n;
    const distractors = shuffle(pool.filter((c) => !sources.includes(c)), rand).slice(0, optionCount - n);
    return { sources, layout, options: shuffle([...sources, ...distractors], rand) };
  });
}

export function FlagMashup({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  // Easy: two-piece flags and few options. Hard: mostly three pieces among many options.
  const layouts = ctx.pick<Layout[]>(['v2', 'h2', 'd2', 'v2', 'h2'], ['v2', 'h2', 'd2', 'v3', 'h3'], ['v3', 'h3', 'd2', 'v3', 'h3']);
  const optionCount = ctx.pick(6, 8, 12);
  const rounds = useMemo(() => makeRounds(ctx.seed, layouts, optionCount), [ctx.seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const [stamps, setStamps] = useState<string[]>([]);
  const r = rounds[idx];
  const n = r.sources.length;

  const toggle = (c: string) => {
    if (done) return;
    setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : p.length < n ? [...p, c] : p));
  };

  const confirm = () => {
    const ok = picked.filter((c) => r.sources.includes(c)).length;
    const wrong = picked.length - ok;
    setScore((s) => s + Math.max(0, Math.round((200 * (ok - wrong * 0.5)) / n)));
    setStamps((s) => [...s, ...picked.filter((c) => r.sources.includes(c))]);
    ctx.hit(ok === n && wrong === 0);
    setDone(true);
  };

  const next = () => {
    if (idx + 1 >= rounds.length) {
      ctx.finish({ points: score, stamps, meta: {} }, { score: String(score) });
      return;
    }
    setIdx((i) => i + 1);
    setPicked([]);
    setDone(false);
  };

  const ok = picked.filter((c) => r.sources.includes(c)).length;

  return (
    <div className="game-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) 300px' }}>
      <div className="card">
        <span className="eyebrow">{t('fm.which')}</span>
        <div className="flag-stage" style={{ marginTop: 12, cursor: 'default' }}>
          <svg viewBox="0 0 640 480">
            <defs>
              {CLIPS[r.layout].map((pts, i) => (
                <clipPath key={i} id={`fm-${idx}-${i}`}><polygon points={pts} /></clipPath>
              ))}
            </defs>
            {r.sources.map((c, i) => (
              <image key={c} href={flagUrl(c)} x="0" y="0" width="640" height="480" preserveAspectRatio="none" clipPath={`url(#fm-${idx}-${i})`} />
            ))}
            {done && CLIPS[r.layout].map((pts, i) => <polygon key={i} points={pts} fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="10 8" />)}
          </svg>
        </div>
        {done && (
          <p className="muted" style={{ textAlign: 'center' }}>
            {t('fm.sources')} {r.sources.map((c) => countryName(c, lang)).join(' · ')}
          </p>
        )}
      </div>
      <aside className="side">
        <div className="row">
          <div className="stat-box" style={{ flex: 1 }}><small>{t('common.round')}</small><b>{idx + 1} / {rounds.length}</b></div>
          <div className="stat-box" style={{ flex: 1 }}><small>{t('common.score')}</small><b>{score}</b></div>
        </div>
        <div className="card">
          <span className="eyebrow">{t('fm.pickN', { n })}</span>
          <div className="wm-options">
            {r.options.map((c) => {
              const state = !done ? (picked.includes(c) ? 'picked' : '') : r.sources.includes(c) ? 'good' : picked.includes(c) ? 'bad' : 'dim';
              return (
                <button key={c} className={`wm-option ${state}`} onClick={() => toggle(c)} disabled={done}>
                  {countryName(c, lang)}
                </button>
              );
            })}
          </div>
          {done ? (
            <>
              <p><b className={ok === n ? 'pill-good' : 'pill-bad'}>{t('fm.result', { ok, n })}</b></p>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={next}>{t('common.next')} →</button>
            </>
          ) : (
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} disabled={picked.length !== n} onClick={confirm}>{t('fm.confirm')}</button>
          )}
        </div>
      </aside>
    </div>
  );
}

export function FlagMashupPage() {
  return (
    <GameShell slug="flag-mashup" rules={['fm.rules.1', 'fm.rules.2', 'fm.rules.3']}>
      {(ctx) => <FlagMashup key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
