'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { addGameText } from '@/lib/gameText';
import { countryName, flagUrl } from '@/lib/geo';
import { GameShell, type GameContext } from '@/components/GameShell';

interface El { icon: string; en: string; vi: string; place?: string; noteEn?: string; noteVi?: string }

const EL: Record<string, El> = {
  earth: { icon: '🪨', en: 'Earth', vi: 'Đất' },
  water: { icon: '💧', en: 'Water', vi: 'Nước' },
  fire: { icon: '🔥', en: 'Fire', vi: 'Lửa' },
  wind: { icon: '💨', en: 'Wind', vi: 'Gió' },
  time: { icon: '⏳', en: 'Time', vi: 'Thời gian' },
  mud: { icon: '🟤', en: 'Mud', vi: 'Bùn' },
  lava: { icon: '🟠', en: 'Lava', vi: 'Dung nham' },
  steam: { icon: '♨️', en: 'Steam', vi: 'Hơi nước' },
  wave: { icon: '🌊', en: 'Wave', vi: 'Sóng' },
  dust: { icon: '🟫', en: 'Dust', vi: 'Bụi' },
  lightning: { icon: '⚡', en: 'Lightning', vi: 'Sét' },
  sea: { icon: '🟦', en: 'Sea', vi: 'Biển' },
  mountain: { icon: '⛰️', en: 'Mountain', vi: 'Núi' },
  rock: { icon: '🪨', en: 'Rock', vi: 'Đá' },
  volcano: { icon: '🌋', en: 'Volcano', vi: 'Núi lửa', place: 'IS', noteEn: 'Iceland sits on the Mid-Atlantic Ridge and erupts every few years.', noteVi: 'Iceland nằm trên sống núi giữa Đại Tây Dương và vài năm lại phun trào.' },
  cloud: { icon: '☁️', en: 'Cloud', vi: 'Mây' },
  rain: { icon: '🌧️', en: 'Rain', vi: 'Mưa' },
  plant: { icon: '🌱', en: 'Plant', vi: 'Cây non' },
  tree: { icon: '🌳', en: 'Tree', vi: 'Cây' },
  forest: { icon: '🌲', en: 'Forest', vi: 'Rừng', place: 'FI', noteEn: 'Finland is about three-quarters forest, the most of any EU country.', noteVi: 'Khoảng ba phần tư Phần Lan là rừng, nhiều nhất EU.' },
  rainforest: { icon: '🌴', en: 'Rainforest', vi: 'Rừng mưa', place: 'BR', noteEn: 'Most of the Amazon rainforest lies in Brazil.', noteVi: 'Phần lớn rừng Amazon nằm ở Brazil.' },
  river: { icon: '🏞️', en: 'River', vi: 'Sông' },
  canyon: { icon: '🏜️', en: 'Canyon', vi: 'Hẻm núi', place: 'US', noteEn: 'The Colorado River carved the Grand Canyon over millions of years.', noteVi: 'Sông Colorado đã khoét nên Grand Canyon qua hàng triệu năm.' },
  delta: { icon: '🔱', en: 'Delta', vi: 'Châu thổ', place: 'BD', noteEn: 'The Ganges–Brahmaputra delta in Bangladesh is the largest on Earth.', noteVi: 'Châu thổ sông Hằng – Brahmaputra ở Bangladesh lớn nhất Trái Đất.' },
  rice: { icon: '🌾', en: 'Rice paddy', vi: 'Ruộng lúa', place: 'VN', noteEn: 'The Mekong Delta grows about half of Vietnam’s rice.', noteVi: 'Đồng bằng sông Cửu Long trồng khoảng một nửa sản lượng lúa Việt Nam.' },
  algae: { icon: '🌿', en: 'Algae', vi: 'Tảo' },
  coral: { icon: '🪸', en: 'Coral reef', vi: 'Rạn san hô', place: 'AU', noteEn: 'The Great Barrier Reef stretches over 2,300 km off Australia.', noteVi: 'Rạn san hô Great Barrier dài hơn 2.300 km ngoài khơi Úc.' },
  desert: { icon: '🐪', en: 'Desert', vi: 'Sa mạc', place: 'EG', noteEn: 'More than 90% of Egypt is desert; most people live along the Nile.', noteVi: 'Hơn 90% Ai Cập là sa mạc; phần lớn dân sống dọc sông Nile.' },
  tornado: { icon: '🌪️', en: 'Tornado', vi: 'Lốc xoáy', place: 'US', noteEn: 'The United States records more tornadoes than any other country.', noteVi: 'Hoa Kỳ ghi nhận nhiều lốc xoáy nhất thế giới.' },
  storm: { icon: '🌩️', en: 'Storm', vi: 'Bão giông' },
  typhoon: { icon: '🌀', en: 'Typhoon', vi: 'Bão nhiệt đới', place: 'PH', noteEn: 'The Philippines is hit by around 20 tropical cyclones a year.', noteVi: 'Philippines hứng khoảng 20 cơn bão nhiệt đới mỗi năm.' },
  snow: { icon: '❄️', en: 'Snow', vi: 'Tuyết' },
  glacier: { icon: '🧊', en: 'Glacier', vi: 'Sông băng', place: 'CH', noteEn: 'The Aletsch Glacier in Switzerland is the largest in the Alps.', noteVi: 'Sông băng Aletsch ở Thụy Sĩ lớn nhất dãy Alps.' },
  fjord: { icon: '🏔️', en: 'Fjord', vi: 'Vịnh hẹp', place: 'NO', noteEn: 'Glaciers carved Norway’s coast into more than a thousand fjords.', noteVi: 'Sông băng đã khoét bờ biển Na Uy thành hơn một nghìn vịnh hẹp.' },
  sand: { icon: '🏖️', en: 'Sand', vi: 'Cát' },
  island: { icon: '🏝️', en: 'Volcanic island', vi: 'Đảo núi lửa', place: 'ID', noteEn: 'Indonesia has more active volcanoes than any other country.', noteVi: 'Indonesia có nhiều núi lửa đang hoạt động nhất thế giới.' },
  hotspring: { icon: '🛁', en: 'Hot spring', vi: 'Suối nước nóng', place: 'JP', noteEn: 'Japan has thousands of onsen hot springs.', noteVi: 'Nhật Bản có hàng nghìn suối nước nóng onsen.' },
  waterfall: { icon: '🌈', en: 'Waterfall', vi: 'Thác nước', place: 'VE', noteEn: 'Angel Falls in Venezuela is the highest uninterrupted waterfall.', noteVi: 'Thác Angel ở Venezuela là thác liền mạch cao nhất.' },
  life: { icon: '🦠', en: 'Life', vi: 'Sự sống' },
  fish: { icon: '🐟', en: 'Fish', vi: 'Cá' },
  animal: { icon: '🐾', en: 'Animal', vi: 'Động vật' },
  human: { icon: '🧑', en: 'Human', vi: 'Con người' },
  fossil: { icon: '🦴', en: 'Fossil', vi: 'Hoá thạch', place: 'MN', noteEn: 'The Gobi in Mongolia is famous for dinosaur fossils and eggs.', noteVi: 'Sa mạc Gobi ở Mông Cổ nổi tiếng với hoá thạch và trứng khủng long.' },
  city: { icon: '🏙️', en: 'City', vi: 'Thành phố', place: 'IQ', noteEn: 'Some of the first cities grew in Mesopotamia, in today’s Iraq.', noteVi: 'Những thành phố đầu tiên ra đời ở Lưỡng Hà, nay là Iraq.' },
};

/** Unordered pair → result. */
const RECIPES: [string, string, string][] = [
  ['earth', 'water', 'mud'], ['earth', 'fire', 'lava'], ['water', 'fire', 'steam'], ['water', 'wind', 'wave'],
  ['earth', 'wind', 'dust'], ['fire', 'wind', 'lightning'], ['water', 'water', 'sea'], ['earth', 'earth', 'mountain'],
  ['lava', 'water', 'rock'], ['lava', 'time', 'volcano'], ['steam', 'wind', 'cloud'], ['cloud', 'water', 'rain'],
  ['rain', 'earth', 'plant'], ['plant', 'time', 'tree'], ['tree', 'tree', 'forest'], ['forest', 'rain', 'rainforest'],
  ['mountain', 'water', 'river'], ['river', 'time', 'canyon'], ['river', 'sea', 'delta'], ['mud', 'plant', 'rice'],
  ['sea', 'plant', 'algae'], ['algae', 'time', 'coral'], ['dust', 'time', 'desert'], ['wind', 'wind', 'tornado'],
  ['cloud', 'lightning', 'storm'], ['storm', 'sea', 'typhoon'], ['mountain', 'wind', 'snow'], ['snow', 'time', 'glacier'],
  ['glacier', 'sea', 'fjord'], ['rock', 'wave', 'sand'], ['volcano', 'sea', 'island'], ['steam', 'rock', 'hotspring'],
  ['river', 'mountain', 'waterfall'], ['water', 'lightning', 'life'], ['life', 'sea', 'fish'], ['life', 'earth', 'animal'],
  ['animal', 'time', 'human'], ['rock', 'life', 'fossil'], ['human', 'river', 'city'],
];
const key = (a: string, b: string) => [a, b].sort().join('+');
const BOOK = new Map(RECIPES.map(([a, b, r]) => [key(a, b), r]));
const BASE = ['earth', 'water', 'fire', 'wind', 'time'];
const TOTAL = RECIPES.length;

addGameText({
  en: { 'el.shelf': 'Your shelf', 'el.found': '{n} / {total} discovered', 'el.nothing': 'Nothing happens…', 'el.known': 'Already known: {name}', 'el.new': 'New: {name}!', 'el.finish': 'Finish', 'el.mix': 'Mix', 'el.clear': 'Clear', 'el.pick': 'Tap two elements to combine them.' },
  vi: { 'el.shelf': 'Kệ của bạn', 'el.found': 'Đã khám phá {n} / {total}', 'el.nothing': 'Không có gì xảy ra…', 'el.known': 'Đã biết: {name}', 'el.new': 'Mới: {name}!', 'el.finish': 'Kết thúc', 'el.mix': 'Trộn', 'el.clear': 'Xoá', 'el.pick': 'Chạm hai nguyên tố để kết hợp.' },
});

export function Elements({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  const [known, setKnown] = useState<string[]>(BASE);
  const [slots, setSlots] = useState<string[]>([]);
  const [last, setLast] = useState<{ id: string | null; text: string; fresh: boolean } | null>(null);
  const name = (id: string) => EL[id][lang];

  const add = (id: string) => {
    const next = slots.length >= 2 ? [id] : [...slots, id];
    setSlots(next);
    if (next.length === 2) mix(next[0], next[1]);
  };

  const mix = (a: string, b: string) => {
    const r = BOOK.get(key(a, b));
    if (!r) setLast({ id: null, text: t('el.nothing'), fresh: false });
    else if (known.includes(r)) setLast({ id: r, text: t('el.known', { name: name(r) }), fresh: false });
    else {
      setKnown((k) => [...k, r]);
      setLast({ id: r, text: t('el.new', { name: name(r) }), fresh: true });
    }
    setTimeout(() => setSlots([]), 600);
  };

  const found = known.length - BASE.length;
  const finish = () => {
    const pts = Math.min(1000, Math.round((1000 * found) / TOTAL));
    const stamps = known.map((k) => EL[k].place).filter((p): p is string => !!p);
    ctx.finish({ points: pts, stamps, meta: { found } }, { score: String(pts), subtitle: t('el.found', { n: found, total: TOTAL }) });
  };

  const info = last?.id ? EL[last.id] : null;

  return (
    <div className="game-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) 300px' }}>
      <div className="card">
        <div className="mixer">
          {[0, 1].map((i) => (
            <div key={i} className="mix-slot">{slots[i] ? <><span>{EL[slots[i]].icon}</span><small>{name(slots[i])}</small></> : '+'}</div>
          ))}
          <span className="muted" style={{ fontSize: 24 }}>=</span>
          <div className={`mix-slot result ${last?.fresh ? 'fresh' : ''}`}>
            {info ? <><span>{info.icon}</span><small>{name(last!.id!)}</small></> : '?'}
          </div>
        </div>
        <p style={{ textAlign: 'center', fontWeight: 600 }} className={last?.fresh ? 'pill-good' : 'muted'}>{last?.text ?? t('el.pick')}</p>
        {info?.place && (
          <div className="row" style={{ justifyContent: 'center', gap: 12 }}>
            <img src={flagUrl(info.place)} alt="" width={36} style={{ borderRadius: 3 }} />
            <span className="small"><b>{countryName(info.place, lang)}</b> · {lang === 'vi' ? info.noteVi : info.noteEn}</span>
          </div>
        )}
        <div className="section-label" style={{ marginTop: 20 }}>{t('el.shelf')}</div>
        <div className="shelf">
          {known.map((id) => (
            <button key={id} className={`el-chip ${slots.includes(id) ? 'on' : ''}`} onClick={() => add(id)}>
              <span>{EL[id].icon}</span>{name(id)}
            </button>
          ))}
        </div>
      </div>
      <aside className="side">
        <div className="stat-box"><small>{t('el.shelf')}</small><b>{t('el.found', { n: found, total: TOTAL })}</b></div>
        <div className="xpbar" style={{ maxWidth: 'none' }}><div style={{ width: `${(found / TOTAL) * 100}%` }} /></div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {known.map((k) => EL[k].place).filter(Boolean).map((p, i) => <img key={i} src={flagUrl(p!)} alt={p} width={30} style={{ borderRadius: 3 }} />)}
        </div>
        <button className="btn btn-primary" onClick={finish} disabled={found === 0}>{t('el.finish')}</button>
      </aside>
    </div>
  );
}

export function ElementsPage() {
  return (
    <GameShell slug="elements" rules={['el.rules.1', 'el.rules.2', 'el.rules.3']}>
      {(ctx) => <Elements key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
