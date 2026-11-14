'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { BADGES, ITEMS, levelInfo, useProgress } from '@/lib/progress';
import { countryName, flagUrl, loadWorld } from '@/lib/geo';
import { openNicknameModal } from '@/components/NicknameModal';
import { TOTAL_COUNTRIES } from '@/components/CollectionSummary';

export default function CollectionPage() {
  const { t, lang } = useI18n();
  const { progress, reset } = useProgress();
  const [all, setAll] = useState<string[]>([]);
  const info = levelInfo(progress.xp);
  const plays = Object.values(progress.games).reduce((s, g) => s + g.plays, 0);

  useEffect(() => {
    loadWorld().then((w) => setAll(w.countries.map((c) => c.a2).sort((a, b) => countryName(a, 'en').localeCompare(countryName(b, 'en')))));
  }, []);

  const stamped = new Set(progress.stamps);
  const list = [...progress.stamps, ...all.filter((a) => !stamped.has(a))];

  return (
    <div className="container">
      <div className="game-top">
        <h1>{t('collection.title')}</h1>
        <span className="spacer" />
        <button className="btn btn-sm" onClick={openNicknameModal}>✎ {t('col.changeNick')}</button>
        <button className="btn btn-sm btn-ghost" onClick={() => confirm(t('col.resetConfirm')) && reset()}>{t('col.reset')}</button>
      </div>
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
        <div className="card stat-tile"><span className="eyebrow">{t('col.level')}</span><span className="big">{info.level}</span><span className="muted small">{t(`tier.${info.tier}`)}</span></div>
        <div className="card stat-tile"><span className="eyebrow">{t('col.xp')}</span><span className="big">{progress.xp}</span></div>
        <div className="card stat-tile"><span className="eyebrow">{t('col.stamps')}</span><span className="big">{progress.stamps.length}<span className="muted" style={{ fontSize: 16 }}> / {TOTAL_COUNTRIES}</span></span></div>
        <div className="card stat-tile"><span className="eyebrow">{t('col.played')}</span><span className="big">{plays}</span></div>
      </div>

      <section className="section">
        <div className="section-head"><h2>{t('collection.passport')}</h2><span className="muted small">{t('col.passportDesc')}</span></div>
        <div className="stamp-grid">
          {list.map((a2) => (
            <div key={a2} className={`stamp ${stamped.has(a2) ? 'on' : ''}`} title={countryName(a2, lang)}>
              {stamped.has(a2) ? <img src={flagUrl(a2)} alt="" /> : <span style={{ fontSize: 18, opacity: 0.3 }}>?</span>}
              <span className={stamped.has(a2) ? '' : 'muted'}>{stamped.has(a2) ? countryName(a2, lang) : a2}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="badges">
        <div className="section-head"><h2>{t('collection.badges')}</h2><span className="muted small">{t('col.badgesDesc')}</span></div>
        <div className="badge-grid">
          {BADGES.map((b) => (
            <div key={b.id} className={`badge ${progress.badges.includes(b.id) ? 'on' : ''}`}>
              <span className="ico">{b.icon}</span>
              <span><b>{b.name[lang]}</b><span className="muted small" style={{ display: 'block' }}>{b.desc[lang]}</span></span>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="items">
        <div className="section-head"><h2>{t('collection.items')}</h2><span className="muted small">{t('col.itemsDesc')}</span></div>
        <div className="badge-grid">
          {ITEMS.map((it) => {
            const on = it.level <= info.level;
            return (
              <div key={it.id} className={`badge ${on ? 'on' : ''}`}>
                <span className="ico">{it.icon}</span>
                <span><b>{it.name[lang]}</b><span className="muted small" style={{ display: 'block' }}>{on ? '✓' : t('col.locked', { n: it.level })}</span></span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
