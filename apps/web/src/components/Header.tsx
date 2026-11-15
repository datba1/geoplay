'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n, LANGS } from '@/lib/i18n';
import { levelInfo, useProgress } from '@/lib/progress';
import { LogoMark } from './Logo';
import { RankMedal } from './RankMedal';
import { NavIcon } from './NavIcon';

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { progress } = useProgress();
  const pathname = usePathname();
  const info = levelInfo(progress.xp);
  const nextLang = LANGS[(LANGS.findIndex((l) => l.code === lang) + 1) % LANGS.length];

  const links = [
    { href: '/games', icon: 'games', label: t('nav.games') },
    { href: '/collection', icon: 'collection', label: t('nav.collection') },
    { href: '/leaderboard', icon: 'leaderboard', label: t('nav.leaderboard') },
    { href: '/handbook', icon: 'handbook', label: t('nav.handbook') },
    { href: '/facts', icon: 'facts', label: t('nav.factsShort') },
  ];

  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="logo">
          <LogoMark />
          <div>
            <div className="logo-text">Geo<i>Play</i></div>
            <div className="logo-sub">{t('brand.sub')}</div>
          </div>
        </Link>
        <nav className="nav">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={pathname === l.href || (l.href === '/games' && pathname.startsWith('/games')) ? 'active' : ''}>
              <NavIcon name={l.icon} />
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="spacer" />
        <button className="icon-btn" onClick={() => setLang(nextLang.code)} title={nextLang.label} style={{ width: 'auto', padding: '0 10px', gap: 6 }}>
          <img src={`/flags/4x3/${LANGS.find((l) => l.code === lang)!.flag}.svg`} alt="" width={18} style={{ borderRadius: 2 }} />
          {lang.toUpperCase()}
        </button>
        <Link href="/leaderboard" className="icon-btn" title={t('nav.leaderboard')}>🏆</Link>
        <Link href="/collection" className="player-chip">
          <RankMedal tier={info.tier} level={info.level} size={34} />
          <span className="player-meta">
            <b>{progress.nickname ?? 'Traveller'}</b>
            <span>{t('player.level', { level: info.level, tier: t(`tier.${info.tier}`), stamps: progress.stamps.length })}</span>
          </span>
          <span className="chip" style={{ padding: '2px 8px' }}>🔥{progress.streak.count}</span>
        </Link>
      </div>
    </header>
  );
}
