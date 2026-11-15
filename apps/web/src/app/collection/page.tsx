'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { BADGES, ITEMS, TIER_START, bestStreak, levelInfo, nextTier, rankTitle, useProgress, xpToReach } from '@/lib/progress';
import { countryName, flagUrl } from '@/lib/geo';
import { CONTINENTS, PASSPORT_COUNTRIES, TOTAL_COUNTRIES } from '@/lib/continents';
import { openNicknameModal } from '@/components/NicknameModal';
import { RankMedal } from '@/components/RankMedal';
import { BadgeMedal, ItemTag, type Metal } from '@/components/Medal';

const BADGE_METAL: Record<string, Metal> = {
  departure: 'bronze', explorer: 'bronze', 'stamps-10': 'bronze', 'daily-1': 'bronze',
  'stamps-30': 'silver', 'level-5': 'silver', 'streak-3': 'silver', 'ts-3star': 'silver', 'bs-80': 'silver',
  'stamps-75': 'gold', 'level-10': 'gold', 'streak-7': 'gold', 'ff-perfect': 'gold', 'combo-8': 'silver', 'hard-3star': 'gold',
};

type Tab = 'passport' | 'badges' | 'items';
const TABS: Tab[] = ['passport', 'badges', 'items'];

/** Small deterministic tilt so stamps look hand-pressed. */
const tilt = (code: string) => ((code.charCodeAt(0) * 7 + code.charCodeAt(1) * 13) % 17) - 8;

const INKS = { asia: '#b23a48', europe: '#2f5d9e', africa: '#a8641c', 'north-america': '#2e7d5b', 'south-america': '#7a3fa0', oceania: '#1f7f8c', other: '#555' };

export default function CollectionPage() {
  const { t, lang } = useI18n();
  const { progress, reset } = useProgress();
  const [tab, setTab] = useState<Tab>('passport');
  const info = levelInfo(progress.xp);
  const plays = Object.values(progress.games).reduce((s, g) => s + g.plays, 0);
  const stamped = useMemo(() => new Set(progress.stamps), [progress.stamps]);
  const passportCount = progress.stamps.filter((s) => PASSPORT_COUNTRIES.has(s)).length;
  const extra = progress.stamps.filter((s) => !PASSPORT_COUNTRIES.has(s));
  const upcoming = nextTier(info.tier);
  const toNext = xpToReach(info.level + 1) - progress.xp;

  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1) as Tab;
      if (TABS.includes(h)) setTab(h);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  const choose = (next: Tab) => {
    setTab(next);
    history.replaceState(null, '', next === 'passport' ? '/collection' : `#${next}`);
  };

  return (
    <div className="container collection">
      {/* ---------- profile ---------- */}
      <section className="profile-card">
        <RankMedal tier={info.tier} level={info.level} size={112} />
        <div className="profile-main">
          <span className="rank-title">{rankTitle(info.level, lang)}</span>
          <div className="profile-name">
            <h1>{progress.nickname ?? t('col.traveller')}</h1>
            <button className="icon-btn" onClick={openNicknameModal} title={t('col.changeNick')}>✎</button>
          </div>
          <p className="muted small">
            {t('col.levelLine', { level: info.level, tier: t(`tier.${info.tier}`) })}
            {upcoming && <> · {t('col.nextTier', { tier: t(`tier.${upcoming}`), level: TIER_START[upcoming] })}</>}
          </p>
          <div className="xp-bar"><div style={{ width: `${(info.into / info.need) * 100}%` }} /></div>
          <p className="muted small">{t('col.xpLine', { xp: progress.xp, left: toNext, next: info.level + 1 })}</p>
        </div>
        <div className="profile-stats">
          <div><b>{passportCount}<small>/{TOTAL_COUNTRIES}</small></b><span>{t('col.stamps')}</span></div>
          <div><b>{progress.badges.length}<small>/{BADGES.length}</small></b><span>{t('collection.badges')}</span></div>
          <div><b>🔥{progress.streak.count}</b><span>{t('col.streak')}</span></div>
          <div><b>{bestStreak(progress)}</b><span>{t('col.bestStreak')}</span></div>
          <div><b>{plays}</b><span>{t('col.played')}</span></div>
        </div>
      </section>

      <div className="collection-bar">
        <div className="segmented" role="tablist">
          {TABS.map((id) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => choose(id)}>
              {t(`col.tab.${id}`)}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <button className="btn btn-sm btn-ghost" onClick={() => confirm(t('col.resetConfirm')) && reset()}>{t('col.reset')}</button>
      </div>

      {/* ---------- passport ---------- */}
      {tab === 'passport' && (
        <section className="passport">
          <header className="passport-cover">
            <svg viewBox="0 0 64 64" className="emblem" aria-hidden>
              <circle cx="32" cy="32" r="28" />
              <ellipse cx="32" cy="32" rx="12" ry="28" />
              <path d="M4 32h56M8 18h48M8 46h48" />
              <path d="M32 10 36 32 32 54 28 32Z" className="needle" />
            </svg>
            <div>
              <h2>{t('col.passportTitle')}</h2>
              <p>PASSPORT · {t('col.passportSub')}</p>
            </div>
          </header>
          <div className="passport-pages">
            {CONTINENTS.map((c) => {
              const got = c.codes.filter((x) => stamped.has(x)).length;
              const sorted = [...c.codes].sort((a, b) =>
                Number(stamped.has(b)) - Number(stamped.has(a)) || countryName(a, lang).localeCompare(countryName(b, lang), lang),
              );
              return (
                <article key={c.id} className="passport-page">
                  <div className="page-head">
                    <h3>{c.name[lang]}</h3>
                    <span>{got}/{c.codes.length}</span>
                  </div>
                  <div className="page-bar"><div style={{ width: `${(got / c.codes.length) * 100}%`, background: INKS[c.id] }} /></div>
                  <div className="stamp-slots">
                    {sorted.map((code) => <Stamp key={code} code={code} on={stamped.has(code)} ink={INKS[c.id]} name={countryName(code, lang)} />)}
                  </div>
                </article>
              );
            })}
            {extra.length > 0 && (
              <article className="passport-page">
                <div className="page-head"><h3>{t('col.territories')}</h3><span>{extra.length}</span></div>
                <div className="stamp-slots">
                  {extra.map((code) => <Stamp key={code} code={code} on ink={INKS.other} name={countryName(code, lang)} />)}
                </div>
              </article>
            )}
          </div>
        </section>
      )}

      {/* ---------- badges ---------- */}
      {tab === 'badges' && (
        <section className="medallions">
          {BADGES.map((b) => {
            const on = progress.badges.includes(b.id);
            const metal = BADGE_METAL[b.id] ?? 'bronze';
            return (
              <div key={b.id} className={`medallion ${on ? 'on' : ''}`}>
                <BadgeMedal glyph={b.id} metal={metal} locked={!on} size={78} />
                <span className={`rarity ${metal}`}>{t(`tier.${metal}`)}</span>
                <b>{b.name[lang]}</b>
                <span className="muted small">{on ? b.desc[lang] : `🔒 ${b.desc[lang]}`}</span>
              </div>
            );
          })}
        </section>
      )}

      {/* ---------- items ---------- */}
      {tab === 'items' && (
        <section className="medallions items">
          {ITEMS.map((it) => {
            const on = it.level <= info.level;
            return (
              <div key={it.id} className={`medallion item ${on ? 'on' : ''}`}>
                <ItemTag glyph={it.id} locked={!on} size={92} />
                <b>{it.name[lang]}</b>
                <span className="muted small">{on ? t('col.owned') : t('col.locked', { n: it.level })}</span>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function Stamp({ code, on, ink, name }: { code: string; on: boolean; ink: string; name: string }) {
  if (!on) {
    return (
      <div className="slot" title={name}>
        <span>{name}</span>
      </div>
    );
  }
  return (
    <div className="slot inked" title={name} style={{ ['--ink' as string]: ink, transform: `rotate(${tilt(code)}deg)` }}>
      <img src={flagUrl(code)} alt="" />
      <span>{name}</span>
    </div>
  );
}
