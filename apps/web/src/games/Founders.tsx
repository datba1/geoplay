'use client';

import { useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { addGameText } from '@/lib/gameText';
import { GameShell, type GameContext } from '@/components/GameShell';
import {
  BUILDINGS, GIFT_GOLD, MAP_H, MAP_W, PEACE_GOLD, RECRUIT, SEASONS, SEASON_NAMES, YIELD,
  answer, attack, build, buildSlots, canAfford, claim, claimCost, declareWar, defenceOf, endSeason, found, generate,
  gift, income, makePeace, maxMandate, owned, player, proposePact, recruit, scoreOf,
  type ActionResult, type Building, type FlagSpec, type Province, type Res, type State, type Terrain,
} from '@/lib/founders/engine';
import type { Effects } from '@/lib/founders/petitions';

addGameText({
  en: {
    'fo.found': 'Choose a province for your capital', 'fo.foundHint': 'Plains and coasts feed a young realm; hills and mountains are easier to defend.',
    'fo.foundHere': 'Found the capital in {name}', 'fo.year': 'Year {y}', 'fo.seasonOf': 'Season {n} of {total}',
    'fo.endSeason': 'End season', 'fo.mandate': 'Mandate', 'fo.stability': 'Stability',
    'fo.gold': 'Gold', 'fo.food': 'Food', 'fo.materials': 'Materials', 'fo.army': 'Army',
    'fo.tab.court': 'Court', 'fo.tab.realm': 'Province', 'fo.tab.army': 'Army', 'fo.tab.diplo': 'Diplomacy',
    'fo.petitions': 'Petitions this season', 'fo.noPetitions': 'All petitions answered.', 'fo.news': 'Chronicle',
    'fo.pick': 'Tap a province on the map.', 'fo.free': 'Free tribes', 'fo.yours': 'Your realm', 'fo.capital': 'Capital',
    'fo.coast': 'Coast', 'fo.yields': 'Yields each season', 'fo.buildings': 'Buildings ({n}/{max})', 'fo.none': 'None yet',
    'fo.claim': 'Claim ({cost} gold, 2 mandate)', 'fo.claimNeeds': 'Needs {n} army; the tribes will cost {loss} soldiers.',
    'fo.attack': 'Attack (2 mandate)', 'fo.defence': 'Defence {n}', 'fo.notAdjacent': 'Not on your border.',
    'fo.recruit': 'Recruit {n} soldiers', 'fo.wars': 'Wars', 'fo.noWars': 'At peace with everyone.', 'fo.targets': 'Provinces you can attack',
    'fo.gift': 'Gift {n} gold', 'fo.pact': 'Trade pact', 'fo.war': 'Declare war', 'fo.peace': 'Offer peace ({n} gold)',
    'fo.relation': 'Attitude', 'fo.atWar': 'At war', 'fo.pacted': 'Pact', 'fo.neutral': 'Neutral', 'fo.fallen': 'Fallen',
    'fo.provinces': '{n} provinces', 'fo.err.mandate': 'Not enough mandate this season.', 'fo.err.gold': 'Not enough gold.',
    'fo.err.cost': 'Not enough resources.', 'fo.err.army': 'Your army is too small.', 'fo.err.relation': 'They do not trust you enough (needs attitude 35).',
    'fo.err.slots': 'No building slots left here.', 'fo.err.terrain': 'Cannot be built on this terrain.', 'fo.err.duplicate': 'Already built here.',
    'fo.err.refused': 'They refused.', 'fo.err.lost': 'The attack failed.', 'fo.income': 'per season', 'fo.result': '{p} provinces · {b} buildings',
    'fo.lost': 'The capital fell', 'fo.b.farm': 'Farm', 'fo.b.mine': 'Mine', 'fo.b.market': 'Market', 'fo.b.temple': 'Temple',
    'fo.b.barracks': 'Barracks', 'fo.b.port': 'Port', 'fo.b.walls': 'Walls', 'fo.walls': '+6 defence', 'fo.temple': '+3 stability',
    'fo.t.plains': 'Plains', 'fo.t.forest': 'Forest', 'fo.t.hills': 'Hills', 'fo.t.mountains': 'Mountains', 'fo.t.desert': 'Desert', 'fo.t.marsh': 'Marsh',
  },
  vi: {
    'fo.found': 'Chọn một vùng đất làm kinh đô', 'fo.foundHint': 'Đồng bằng và vùng ven biển nuôi sống vương quốc non trẻ; đồi núi thì dễ phòng thủ.',
    'fo.foundHere': 'Đặt kinh đô tại {name}', 'fo.year': 'Năm {y}', 'fo.seasonOf': 'Mùa {n}/{total}',
    'fo.endSeason': 'Sang mùa', 'fo.mandate': 'Mệnh lệnh', 'fo.stability': 'Ổn định',
    'fo.gold': 'Vàng', 'fo.food': 'Lương thực', 'fo.materials': 'Vật liệu', 'fo.army': 'Quân',
    'fo.tab.court': 'Triều đình', 'fo.tab.realm': 'Vùng đất', 'fo.tab.army': 'Quân đội', 'fo.tab.diplo': 'Ngoại giao',
    'fo.petitions': 'Tấu chương mùa này', 'fo.noPetitions': 'Đã phê hết tấu chương.', 'fo.news': 'Biên niên',
    'fo.pick': 'Chạm vào một vùng trên bản đồ.', 'fo.free': 'Bộ lạc tự do', 'fo.yours': 'Lãnh thổ của bạn', 'fo.capital': 'Kinh đô',
    'fo.coast': 'Ven biển', 'fo.yields': 'Sản lượng mỗi mùa', 'fo.buildings': 'Công trình ({n}/{max})', 'fo.none': 'Chưa có',
    'fo.claim': 'Sáp nhập ({cost} vàng, 2 mệnh lệnh)', 'fo.claimNeeds': 'Cần {n} quân; bộ lạc sẽ làm hao {loss} lính.',
    'fo.attack': 'Tấn công (2 mệnh lệnh)', 'fo.defence': 'Phòng thủ {n}', 'fo.notAdjacent': 'Không giáp lãnh thổ của bạn.',
    'fo.recruit': 'Chiêu mộ {n} lính', 'fo.wars': 'Chiến tranh', 'fo.noWars': 'Hòa bình với mọi nước.', 'fo.targets': 'Vùng có thể tấn công',
    'fo.gift': 'Tặng {n} vàng', 'fo.pact': 'Hiệp ước thương mại', 'fo.war': 'Tuyên chiến', 'fo.peace': 'Cầu hòa ({n} vàng)',
    'fo.relation': 'Thái độ', 'fo.atWar': 'Đang chiến', 'fo.pacted': 'Đồng minh buôn bán', 'fo.neutral': 'Trung lập', 'fo.fallen': 'Đã sụp đổ',
    'fo.provinces': '{n} vùng', 'fo.err.mandate': 'Không đủ mệnh lệnh mùa này.', 'fo.err.gold': 'Không đủ vàng.',
    'fo.err.cost': 'Không đủ tài nguyên.', 'fo.err.army': 'Quân đội quá mỏng.', 'fo.err.relation': 'Họ chưa đủ tin bạn (cần thái độ 35).',
    'fo.err.slots': 'Vùng này hết chỗ xây.', 'fo.err.terrain': 'Không xây được trên địa hình này.', 'fo.err.duplicate': 'Đã xây ở đây rồi.',
    'fo.err.refused': 'Họ từ chối.', 'fo.err.lost': 'Cuộc tấn công thất bại.', 'fo.income': 'mỗi mùa', 'fo.result': '{p} vùng · {b} công trình',
    'fo.lost': 'Kinh đô thất thủ', 'fo.b.farm': 'Nông trại', 'fo.b.mine': 'Mỏ', 'fo.b.market': 'Chợ', 'fo.b.temple': 'Đền',
    'fo.b.barracks': 'Trại lính', 'fo.b.port': 'Cảng', 'fo.b.walls': 'Thành lũy', 'fo.walls': '+6 phòng thủ', 'fo.temple': '+3 ổn định',
    'fo.t.plains': 'Đồng bằng', 'fo.t.forest': 'Rừng', 'fo.t.hills': 'Đồi', 'fo.t.mountains': 'Núi', 'fo.t.desert': 'Sa mạc', 'fo.t.marsh': 'Đầm lầy',
  },
});

const TERRAIN_FILL: Record<Terrain, string> = {
  plains: '#7f9a5c', forest: '#4c7650', hills: '#9a8758', mountains: '#a59d8f', desert: '#c9ad72', marsh: '#5f8579',
};
const RES: Res[] = ['gold', 'food', 'materials', 'army'];
const BUILD_ORDER: Building[] = ['farm', 'mine', 'market', 'port', 'temple', 'barracks', 'walls'];

/* ---------------- small drawings ---------------- */

function ResIcon({ r, size = 15 }: { r: Res | 'stability' | 'mandate'; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 20 20', 'aria-hidden': true } as const;
  switch (r) {
    case 'gold': return <svg {...common}><ellipse cx="10" cy="13" rx="7" ry="3" fill="#b8862b" /><ellipse cx="10" cy="10" rx="7" ry="3" fill="#e9b949" /><ellipse cx="10" cy="7" rx="7" ry="3" fill="#f7d77a" stroke="#b8862b" strokeWidth=".8" /></svg>;
    case 'food': return <svg {...common}><path d="M10 18V6" stroke="#c99a3c" strokeWidth="1.6" /><path d="M10 7c-3-1-4-3-4-5 3 0 4 2 4 5zm0 0c3-1 4-3 4-5-3 0-4 2-4 5zm0 4c-3-1-4-3-4-5 3 0 4 2 4 5zm0 0c3-1 4-3 4-5-3 0-4 2-4 5z" fill="#f0c55a" /></svg>;
    case 'materials': return <svg {...common}><rect x="2" y="9" width="16" height="5" rx="2.5" fill="#9b6b3e" /><rect x="4" y="4" width="13" height="5" rx="2.5" fill="#b9834f" /><circle cx="16" cy="11.5" r="1.6" fill="#e3c08f" /></svg>;
    case 'army': return <svg {...common}><path d="M4 16 15 5M13 4l3 3" stroke="#cfd6e4" strokeWidth="2" strokeLinecap="round" /><path d="M6 12l2 2-3 3-2-2z" fill="#8a6a43" /></svg>;
    case 'stability': return <svg {...common}><path d="M10 3v13M4 16h12M3 8h14" stroke="#c9b6ff" strokeWidth="1.6" strokeLinecap="round" /><path d="M3 8l-2 5h4zM17 8l-2 5h4z" fill="#9f87e8" /></svg>;
    default: return <svg {...common}><path d="M10 2l2.4 5 5.6.6-4.2 3.8 1.2 5.6L10 14.2 5 17l1.2-5.6L2 7.6 7.6 7z" fill="#f5c45c" /></svg>;
  }
}

export function Flag({ spec, w = 30 }: { spec: FlagSpec; w?: number }) {
  const [a, b, c] = spec.colors;
  const h = (w * 2) / 3;
  return (
    <svg width={w} height={h} viewBox="0 0 30 20" className="fo-flag" aria-hidden>
      {spec.layout === 'v3' && <><rect width="10" height="20" fill={a} /><rect x="10" width="10" height="20" fill={b} /><rect x="20" width="10" height="20" fill={c} /></>}
      {spec.layout === 'h3' && <><rect width="30" height="7" fill={a} /><rect y="7" width="30" height="6" fill={b} /><rect y="13" width="30" height="7" fill={c} /></>}
      {spec.layout === 'cross' && <><rect width="30" height="20" fill={a} /><rect x="9" width="4" height="20" fill={b} /><rect y="8" width="30" height="4" fill={b} /></>}
      {spec.layout === 'diag' && <><rect width="30" height="20" fill={a} /><path d="M0 20 30 0V20Z" fill={b} /></>}
      {spec.layout === 'canton' && <><rect width="30" height="20" fill={a} /><rect width="13" height="10" fill={b} /></>}
      {spec.emblem === 'star' && <path d="M15 5.5l1.3 3 3.2.3-2.4 2.1.7 3.2-2.8-1.7-2.8 1.7.7-3.2-2.4-2.1 3.2-.3z" fill={c === a ? b : c} />}
      {spec.emblem === 'sun' && <circle cx="15" cy="10" r="3.4" fill={c === a ? b : c} />}
      {spec.emblem === 'diamond' && <path d="M15 5l4 5-4 5-4-5z" fill={c === a ? b : c} />}
      {spec.emblem === 'ring' && <circle cx="15" cy="10" r="3.4" fill="none" stroke={c === a ? b : c} strokeWidth="1.6" />}
      <rect width="30" height="20" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth=".8" />
    </svg>
  );
}

function EffectChips({ e }: { e: Effects }) {
  const { t } = useI18n();
  const items = (['gold', 'food', 'materials', 'army', 'stability'] as const).filter((k) => e[k]);
  return (
    <span className="fo-effects">
      {items.map((k) => (
        <span key={k} className={e[k]! > 0 ? 'up' : 'down'}><ResIcon r={k} size={12} />{e[k]! > 0 ? '+' : ''}{e[k]}</span>
      ))}
      {e.relations ? <span className={e.relations > 0 ? 'up' : 'down'}>🤝{e.relations > 0 ? '+' : ''}{e.relations}</span> : null}
      {!items.length && !e.relations && <span className="muted">{t('fo.none')}</span>}
    </span>
  );
}

const Cost = ({ cost }: { cost: Partial<Record<Res, number>> }) => (
  <span className="fo-cost">{Object.entries(cost).map(([k, v]) => <span key={k}><ResIcon r={k as Res} size={12} />{v}</span>)}</span>
);

/* ---------------- game ---------------- */

type Tab = 'court' | 'realm' | 'army' | 'diplo';

export function Founders({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  const [state, setState] = useState<State>(() => generate(ctx.seed, ctx.difficulty));
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('court');
  const [toast, setToast] = useState<string | null>(null);
  const me = player(state);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((m) => (m === msg ? null : m)), 2600);
  };

  const run = (r: ActionResult, hit?: boolean) => {
    setState(r.state);
    if (!r.ok && r.reason) flash(t(`fo.err.${r.reason}`));
    if (hit !== undefined) ctx.hit(r.ok);
  };

  const finishRun = (s: State) => {
    const { total } = scoreOf(s);
    const mine = owned(s, 0);
    const buildings = mine.reduce((n, p) => n + p.buildings.length, 0);
    ctx.finish(
      { points: total, stamps: [], meta: { provinces: mine.length, buildings, lost: s.lost, seasons: s.season } },
      { score: String(total), subtitle: s.lost ? t('fo.lost') : t('fo.result', { p: mine.length, b: buildings }) },
    );
  };

  const nextSeason = () => {
    const s = endSeason(state);
    setState(s);
    if (s.phase === 'over') finishRun(s);
  };

  const inc = useMemo(() => (state.phase === 'play' ? income(state, 0) : null), [state]);
  const sel = selected !== null ? state.provinces[selected] : null;

  const clickProvince = (p: Province) => {
    setSelected(p.id);
    if (state.phase === 'play') setTab('realm');
  };

  // Map paths are static for a run.
  const paths = useMemo(() => state.provinces.map((p) => `M${p.poly.map((pt) => pt.join(',')).join('L')}Z`), [state.provinces.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const year = Math.floor(state.season / 4) + 1;
  const seasonName = SEASON_NAMES[lang][state.season % 4];

  return (
    <div className="fo">
      {/* ---------- status bar ---------- */}
      <div className="fo-bar">
        <span className="fo-season">
          <span><b>{seasonName}</b> · {t('fo.year', { y: year })}</span>
          <small>{t('fo.seasonOf', { n: Math.min(state.season + 1, SEASONS), total: SEASONS })}</small>
        </span>
        {state.phase !== 'found' && (
          <>
            {RES.map((r) => (
              <span key={r} className="fo-res" title={t(`fo.${r}`)}>
                <ResIcon r={r} />
                <b>{me[r]}</b>
                {inc && <small className={inc[r] >= 0 ? 'up' : 'down'}>{inc[r] >= 0 ? '+' : ''}{inc[r]}</small>}
              </span>
            ))}
            <span className="fo-res fo-stab" title={t('fo.stability')}>
              <ResIcon r="stability" />
              <span className="fo-stab-bar"><span style={{ width: `${me.stability}%`, background: me.stability < 25 ? 'var(--red)' : undefined }} /></span>
              <b>{me.stability}</b>
            </span>
            <span className="fo-res" title={t('fo.mandate')}>
              <ResIcon r="mandate" />
              <b>{state.mandate}</b><small>/{maxMandate(state)}</small>
            </span>
            <span className="spacer" />
            <button className="btn btn-primary btn-sm" onClick={nextSeason} disabled={state.phase !== 'play'}>{t('fo.endSeason')} ⏵</button>
          </>
        )}
      </div>

      <div className="fo-main">
        {/* ---------- map ---------- */}
        <div className="fo-map">
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label="map">
            <defs>
              <radialGradient id="fo-sea" cx="50%" cy="45%" r="70%">
                <stop offset="0" stopColor="#173057" />
                <stop offset="1" stopColor="#0a1530" />
              </radialGradient>
              <pattern id="fo-p-forest" width="14" height="14" patternUnits="userSpaceOnUse">
                <path d="M7 3l3 6H4z" fill="rgba(20,45,28,.45)" />
              </pattern>
              <pattern id="fo-p-hills" width="18" height="12" patternUnits="userSpaceOnUse">
                <path d="M2 9q5-6 10 0" fill="none" stroke="rgba(60,45,20,.4)" strokeWidth="1.2" />
              </pattern>
              <pattern id="fo-p-mountains" width="22" height="16" patternUnits="userSpaceOnUse">
                <path d="M3 13l6-9 6 9" fill="rgba(255,255,255,.18)" stroke="rgba(50,45,40,.55)" strokeWidth="1.2" />
              </pattern>
              <pattern id="fo-p-desert" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="3" cy="3" r=".9" fill="rgba(120,90,40,.45)" />
              </pattern>
              <pattern id="fo-p-marsh" width="16" height="10" patternUnits="userSpaceOnUse">
                <path d="M2 6h6M9 3h5" stroke="rgba(30,60,55,.55)" strokeWidth="1.2" strokeLinecap="round" />
              </pattern>
              <pattern id="fo-p-plains" width="16" height="16" patternUnits="userSpaceOnUse">
                <path d="M4 10v-3M6 10v-4M8 10v-3" stroke="rgba(60,80,30,.3)" strokeWidth="1" />
              </pattern>
              <pattern id="fo-waves" width="40" height="18" patternUnits="userSpaceOnUse">
                <path d="M2 10q5-5 10 0t10 0" fill="none" stroke="rgba(160,200,255,.07)" strokeWidth="1.2" />
              </pattern>
            </defs>
            <rect width={MAP_W} height={MAP_H} fill="url(#fo-sea)" />
            <rect width={MAP_W} height={MAP_H} fill="url(#fo-waves)" />
            {/* surf around the coast */}
            <g opacity=".22">{paths.map((d, i) => <path key={i} d={d} fill="none" stroke="#bfe3ff" strokeWidth={10} strokeLinejoin="round" />)}</g>
            {state.provinces.map((p, i) => (
              <g key={p.id} className="fo-prov" onClick={() => clickProvince(p)}>
                <path d={paths[i]} fill={TERRAIN_FILL[p.terrain]} stroke={TERRAIN_FILL[p.terrain]} strokeWidth={1} />
                <path d={paths[i]} fill={`url(#fo-p-${p.terrain})`} />
                {p.owner !== null && (
                  <path d={paths[i]} fill={state.nations[p.owner].color} fillOpacity={p.owner === 0 ? 0.62 : 0.48} />
                )}
                <path d={paths[i]} fill="none" stroke="rgba(15,20,30,.35)" strokeWidth={0.8} strokeDasharray="3 2" />
              </g>
            ))}
            {/* realm borders */}
            {state.provinces.map((p, i) => p.owner !== null && (
              <path key={`b${p.id}`} d={paths[i]} fill="none" stroke={p.owner === 0 ? '#fff4c2' : state.nations[p.owner].color} strokeWidth={p.owner === 0 ? 2.6 : 2.2} strokeOpacity={0.95} pointerEvents="none" />
            ))}
            {sel && <path d={paths[sel.id]} fill="none" stroke="#fff" strokeWidth={3} strokeDasharray="6 4" pointerEvents="none" />}
            {state.provinces.map((p) => (
              <text key={`t${p.id}`} x={p.cx} y={p.cy + 18} className="fo-name" textAnchor="middle">{p.name}</text>
            ))}
            {state.nations.filter((n) => n.alive && n.capital >= 0).map((n) => {
              const c = state.provinces[n.capital];
              return (
                <g key={`c${n.id}`} transform={`translate(${c.cx - 15} ${c.cy - 18})`} pointerEvents="none">
                  <path d="M0 0v26" stroke="#2b2116" strokeWidth="1.5" />
                  <g transform="translate(1 0)"><Flag spec={n.flag} w={24} /></g>
                </g>
              );
            })}
          </svg>
          {state.phase === 'found' && (
            <div className="fo-found">
              <h3>{t('fo.found')}</h3>
              <p className="small muted">{t('fo.foundHint')}</p>
              {sel && (
                <button className="btn btn-primary" onClick={() => { setState(found(state, sel.id)); setTab('court'); }}>
                  {t('fo.foundHere', { name: sel.name })} · {t(`fo.t.${sel.terrain}`)}{sel.coast ? ` · ${t('fo.coast')}` : ''}
                </button>
              )}
            </div>
          )}
          {toast && <div className="fo-toast">{toast}</div>}
        </div>

        {/* ---------- side panel ---------- */}
        <aside className="fo-side">
          <div className="fo-realm-head">
            <Flag spec={me.flag} w={54} />
            <div>
              <b>{me.name}</b>
              <span className="muted small">{state.phase === 'found' ? t('fo.found') : t('fo.provinces', { n: owned(state, 0).length })}</span>
            </div>
          </div>
          {state.phase !== 'found' && (
            <div className="fo-tabs" role="tablist">
              {(['court', 'realm', 'army', 'diplo'] as Tab[]).map((id) => (
                <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                  {t(`fo.tab.${id}`)}
                  {id === 'court' && state.petitions.length > 0 && <span className="fo-dot">{state.petitions.length}</span>}
                </button>
              ))}
            </div>
          )}

          {state.phase === 'found' && sel && <ProvinceInfo s={state} p={sel} />}

          {state.phase === 'play' && tab === 'court' && (
            <div className="fo-pane">
              <h4>{t('fo.petitions')}</h4>
              {state.petitions.length === 0 && <p className="muted small">{t('fo.noPetitions')}</p>}
              {state.petitions.map((op) => (
                <div key={op.id} className="fo-petition">
                  <p>{op.petition.text[lang]}</p>
                  {op.petition.options.map((o, i) => (
                    <button key={i} className="fo-choice" onClick={() => setState(answer(state, op.id, i as 0 | 1))}>
                      <span>{o.label[lang]}</span>
                      <EffectChips e={o.effects} />
                    </button>
                  ))}
                </div>
              ))}
              <h4>{t('fo.news')}</h4>
              <ul className="fo-log">
                {state.log.slice(0, 10).map((l, i) => (
                  <li key={i} className={l.tone}><small>{SEASON_NAMES[lang][l.season % 4]} {Math.floor(l.season / 4) + 1}</small> {l.text[lang]}</li>
                ))}
              </ul>
            </div>
          )}

          {state.phase === 'play' && tab === 'realm' && (
            <div className="fo-pane">
              {!sel ? <p className="muted small">{t('fo.pick')}</p> : (
                <>
                  <ProvinceInfo s={state} p={sel} />
                  <ProvinceActions s={state} p={sel} run={run} />
                </>
              )}
            </div>
          )}

          {state.phase === 'play' && tab === 'army' && (
            <div className="fo-pane">
              <div className="fo-big"><ResIcon r="army" size={22} /> <b>{me.army}</b></div>
              <button className="btn" style={{ width: '100%' }} onClick={() => run(recruit(state))} disabled={state.mandate < 1 || !canAfford(me, RECRUIT.cost)}>
                {t('fo.recruit', { n: RECRUIT.army })} · <Cost cost={RECRUIT.cost} />
              </button>
              <h4>{t('fo.wars')}</h4>
              {state.nations.slice(1).filter((n) => n.war && n.alive).length === 0 && <p className="muted small">{t('fo.noWars')}</p>}
              {state.nations.slice(1).filter((n) => n.war && n.alive).map((n) => {
                const targets = owned(state, n.id).filter((p) => p.neighbors.some((x) => state.provinces[x].owner === 0));
                return (
                  <div key={n.id} className="fo-war">
                    <div className="row"><Flag spec={n.flag} w={26} /><b>{n.name}</b><span className="spacer" /><span className="small"><ResIcon r="army" size={12} /> {n.army}</span></div>
                    {targets.map((p) => (
                      <button key={p.id} className="fo-choice" onClick={() => run(attack(state, p.id), true)} disabled={state.mandate < 2}>
                        <span>{p.name}</span><span className="small muted">{t('fo.defence', { n: defenceOf(state, p) })}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {state.phase === 'play' && tab === 'diplo' && (
            <div className="fo-pane">
              {state.nations.slice(1).map((n) => (
                <div key={n.id} className={`fo-nation ${n.alive ? '' : 'dead'}`}>
                  <div className="row">
                    <Flag spec={n.flag} w={30} />
                    <div style={{ flex: 1 }}>
                      <b style={{ color: n.color }}>{n.name}</b>
                      <div className="small muted">{t('fo.provinces', { n: owned(state, n.id).length })} · <ResIcon r="army" size={11} /> {n.army}</div>
                    </div>
                    <span className={`chip ${n.war ? 'fo-war-chip' : n.pact ? 'chip-on' : ''}`}>
                      {!n.alive ? t('fo.fallen') : n.war ? t('fo.atWar') : n.pact ? t('fo.pacted') : t('fo.neutral')}
                    </span>
                  </div>
                  {n.alive && (
                    <>
                      <div className="fo-rel" title={t('fo.relation')}>
                        <span style={{ left: '50%', width: `${Math.abs(n.relation) / 2}%`, transform: n.relation < 0 ? 'translateX(-100%)' : undefined, background: n.relation < 0 ? 'var(--red)' : 'var(--green)' }} />
                      </div>
                      <div className="fo-diplo-actions">
                        {!n.war && <button className="btn btn-sm" onClick={() => run(gift(state, n.id))}>{t('fo.gift', { n: GIFT_GOLD })}</button>}
                        {!n.war && !n.pact && <button className="btn btn-sm" onClick={() => run(proposePact(state, n.id))}>{t('fo.pact')}</button>}
                        {!n.war && <button className="btn btn-sm fo-danger" onClick={() => run(declareWar(state, n.id))}>{t('fo.war')}</button>}
                        {n.war && <button className="btn btn-sm" onClick={() => run(makePeace(state, n.id))}>{t('fo.peace', { n: PEACE_GOLD })}</button>}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ProvinceInfo({ s, p }: { s: State; p: Province }) {
  const { t } = useI18n();
  const owner = p.owner === null ? null : s.nations[p.owner];
  return (
    <div className="fo-prov-info">
      <div className="row">
        <h3>{p.name}</h3>
        <span className="spacer" />
        {owner && <Flag spec={owner.flag} w={26} />}
      </div>
      <p className="small muted">
        {t(`fo.t.${p.terrain}`)}{p.coast ? ` · ${t('fo.coast')}` : ''} · {owner ? (owner.id === 0 ? t('fo.yours') : owner.name) : t('fo.free')}
        {owner && p.id === owner.capital ? ` · ${t('fo.capital')}` : ''}
      </p>
      <div className="small"><span className="muted">{t('fo.yields')}:</span> <EffectChips e={{ ...YIELD[p.terrain], gold: (YIELD[p.terrain].gold ?? 0) + (p.coast ? 1 : 0) || undefined }} /></div>
      <div className="small"><span className="muted">{t('fo.defence', { n: defenceOf(s, p) })}</span></div>
    </div>
  );
}

function ProvinceActions({ s, p, run }: { s: State; p: Province; run: (r: ActionResult, hit?: boolean) => void }) {
  const { t } = useI18n();
  const me = player(s);
  const adjacent = p.neighbors.some((n) => s.provinces[n].owner === 0);

  if (p.owner === null) {
    if (!adjacent) return <p className="muted small">{t('fo.notAdjacent')}</p>;
    const cost = claimCost(s);
    return (
      <>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => run(claim(s, p.id), true)}
          disabled={s.mandate < 2 || !canAfford(me, cost) || me.army < p.tribe}>
          {t('fo.claim', { cost: cost.gold })}
        </button>
        <p className="small muted">{t('fo.claimNeeds', { n: p.tribe, loss: Math.ceil(p.tribe / 2) })}</p>
      </>
    );
  }
  if (p.owner !== 0) {
    const foe = s.nations[p.owner];
    if (!foe.war) return null;
    if (!adjacent) return <p className="muted small">{t('fo.notAdjacent')}</p>;
    return <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => run(attack(s, p.id), true)} disabled={s.mandate < 2}>{t('fo.attack')}</button>;
  }
  const slots = buildSlots(s, p);
  return (
    <>
      <h4>{t('fo.buildings', { n: p.buildings.length, max: slots })}</h4>
      <div className="fo-built">{p.buildings.length ? p.buildings.map((b, i) => <span key={i} className="chip">{t(`fo.b.${b}`)}</span>) : <span className="muted small">{t('fo.none')}</span>}</div>
      {p.buildings.length < slots && (
        <div className="fo-build-list">
          {BUILD_ORDER.filter((b) => !BUILDINGS[b].needs || BUILDINGS[b].needs!(p)).filter((b) => b === 'walls' || !p.buildings.includes(b)).map((b) => {
            const spec = BUILDINGS[b];
            const yields = { ...spec.yields } as Effects;
            if (spec.stability) yields.stability = spec.stability;
            return (
              <button key={b} className="fo-choice" onClick={() => run(build(s, p.id, b))} disabled={s.mandate < 1 || !canAfford(me, spec.cost)}>
                <span>{t(`fo.b.${b}`)} <small className="muted">{b === 'walls' ? t('fo.walls') : ''}</small></span>
                <span className="fo-build-meta"><EffectChips e={yields} /><Cost cost={spec.cost} /></span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

export function FoundersPage() {
  return (
    <GameShell slug="founders" rules={['fo.rules.1', 'fo.rules.2', 'fo.rules.3']}>
      {(ctx) => <Founders key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
