'use client';

import Link from 'next/link';
import { useI18n, LANGS } from '@/lib/i18n';
import { GAMES, gameName } from '@/lib/games';
import { CATEGORIES } from './GameGrid';

const playable = GAMES.filter((g) => g.implemented);
/** Most recently added games, newest first. */
const NEWEST = ['founders', 'north-south', 'capital-pin'];
const CAT_COLOR: Record<string, string> = { maps: '#fbbf24', flags: '#fb7185', data: '#60a5fa', strategy: '#a78bfa', nature: '#4fd1a1' };
import { LogoMark } from './Logo';

export function Footer() {
  const { t, lang, setLang } = useI18n();
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="logo" style={{ marginBottom: 10 }}>
            <LogoMark />
            <div className="logo-text" style={{ color: 'var(--text)' }}>Geo<i>Play</i></div>
          </div>
          <p>{t('footer.about')}</p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {LANGS.map((l) => (
              <button key={l.code} className={`lang-chip ${lang === l.code ? 'on' : ''}`} onClick={() => setLang(l.code)}>
                <img src={`/flags/4x3/${l.flag}.svg`} alt="" width={18} />{l.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4>{t('nav.games')}</h4>
          <ul className="footer-games">
            <li><Link href="/games"><b>{t('gp.all')} ({playable.length}) →</b></Link></li>
            {CATEGORIES.map((c) => (
              <li key={c}>
                <Link href={`/games?cat=${c}`}>
                  <i className="dot" style={{ background: CAT_COLOR[c] }} />
                  {t(`games.${c}`)} <span className="muted">· {playable.filter((g) => g.category === c).length}</span>
                </Link>
              </li>
            ))}
          </ul>
          <h5 className="footer-sub">{t('footer.newGames')}</h5>
          <ul className="footer-games">
            {NEWEST.map((slug) => (
              <li key={slug}><Link href={`/games/${slug}`}>{t(gameName(slug))}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4>{t('nav.collection')}</h4>
          <ul>
            <li><Link href="/collection">{t('collection.passport')}</Link></li>
            <li><Link href="/collection#badges">{t('collection.badges')}</Link></li>
            <li><Link href="/leaderboard">{t('nav.leaderboard')}</Link></li>
            <li><Link href="/handbook">{t('nav.handbook')}</Link></li>
            <li><Link href="/facts">{t('nav.facts')}</Link></li>
          </ul>
        </div>
        <div>
          <h4>{t('footer.data')}</h4>
          <ul>
            <li><a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth 1:110m ↗</a></li>
            <li><a href="https://github.com/topojson/world-atlas" target="_blank" rel="noreferrer">world-atlas ↗</a></li>
            <li><a href="https://github.com/lipis/flag-icons" target="_blank" rel="noreferrer">flag-icons (MIT) ↗</a></li>
            <li><a href="https://d3js.org/d3-geo" target="_blank" rel="noreferrer">d3-geo ↗</a></li>
          </ul>
        </div>
      </div>
      <div className="container" style={{ marginTop: 24 }}>
        <p className="small">🗺 {t('footer.disclaimer')}</p>
        <p className="small">🔒 {t('footer.privacy')}</p>
        <p className="small">🇻🇳 {t('footer.islands')}</p>
        <p className="small">© {new Date().getFullYear()} GeoPlay</p>
      </div>
    </footer>
  );
}
