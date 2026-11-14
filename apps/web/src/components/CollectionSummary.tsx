'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { BADGES, ITEMS, levelInfo, unlockedItems, useProgress } from '@/lib/progress';
import { flagUrl } from '@/lib/geo';

export const TOTAL_COUNTRIES = 195;

function PassportArt({ stamps }: { stamps: string[] }) {
  return (
    <div className="vt-art">
      <svg className="passport-book" viewBox="0 0 60 78" aria-hidden>
        <rect x="1" y="1" width="58" height="76" rx="5" fill="#5b1d2a" stroke="#c9953f" strokeWidth="1.2" />
        <circle cx="30" cy="30" r="11" fill="none" stroke="#e8c27a" strokeWidth="1.2" />
        <path d="M19 30h22M30 19c-5 4-5 18 0 22M30 19c5 4 5 18 0 22" stroke="#e8c27a" strokeWidth="1" fill="none" />
        <text x="30" y="56" textAnchor="middle" fontSize="6.5" fill="#e8c27a" letterSpacing="1">PASSPORT</text>
        <text x="30" y="65" textAnchor="middle" fontSize="6" fill="#e8c27a" letterSpacing="1">GEOPLAY</text>
      </svg>
      <div className="stamp-row">
        {[0, 1, 2].map((i) =>
          stamps[i] ? (
            <span key={i} className="mini-stamp on"><img src={flagUrl(stamps[i])} alt="" /></span>
          ) : (
            <span key={i} className="mini-stamp" />
          ),
        )}
      </div>
    </div>
  );
}

export function CollectionSummary() {
  const { t, lang } = useI18n();
  const { progress } = useProgress();
  const nextBadge = BADGES.find((b) => !progress.badges.includes(b.id));
  const items = unlockedItems(progress.xp);
  const level = levelInfo(progress.xp).level;
  const nextItem = ITEMS.find((i) => i.level > level);
  const recent = progress.stamps.slice(-3).reverse();
  const shownBadges = BADGES.slice(0, 3);

  return (
    <div className="section">
      <div className="section-label">{t('collection.title')}</div>
      <div className="vault">
        <Link href="/collection" className="vt">
          <PassportArt stamps={recent} />
          <div className="vt-body">
            <span className="eyebrow muted-eyebrow">{t('collection.passport')}</span>
            <span className="big">{progress.stamps.length}<small> / {TOTAL_COUNTRIES}</small></span>
            <div className="vt-bar"><div style={{ width: `${(progress.stamps.length / TOTAL_COUNTRIES) * 100}%` }} /></div>
            <span className="vt-foot">
              <span>{progress.stamps.length ? t('collection.stampsRecent') : t('collection.firstStamp')}</span>
              <span className="arrow">→</span>
            </span>
          </div>
        </Link>

        <Link href="/collection#badges" className="vt">
          <div className="vt-art">
            <div className="medals">
              {shownBadges.map((b) => (
                <span key={b.id} className={`medal-disc ${progress.badges.includes(b.id) ? 'on' : ''}`}>{b.icon}</span>
              ))}
            </div>
          </div>
          <div className="vt-body">
            <span className="eyebrow muted-eyebrow">{t('collection.badges')}</span>
            <span className="big">{progress.badges.length}<small> / {BADGES.length}</small></span>
            <div className="vt-bar"><div style={{ width: `${(progress.badges.length / BADGES.length) * 100}%` }} /></div>
            <span className="vt-foot">
              <span>{nextBadge ? t('collection.next', { name: nextBadge.name[lang] }) : '✓'}</span>
              <span className="arrow">→</span>
            </span>
          </div>
        </Link>

        <Link href="/collection#items" className="vt">
          <div className="vt-art">
            <span className="orb" />
            <div className="item-chips">
              {items.slice(0, 3).map((i) => (
                <span key={i.id} className="item-chip">{i.icon} {i.name[lang]}</span>
              ))}
            </div>
          </div>
          <div className="vt-body">
            <span className="eyebrow muted-eyebrow">{t('collection.items')}</span>
            <span className="big">{items.length}<small> / {ITEMS.length}</small></span>
            <div className="vt-bar"><div style={{ width: `${(items.length / ITEMS.length) * 100}%` }} /></div>
            <span className="vt-foot">
              <span>{nextItem ? t('collection.itemNext', { n: nextItem.level, name: nextItem.name[lang] }) : '✓'}</span>
              <span className="arrow">→</span>
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
