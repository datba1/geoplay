'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

/** Bottom tab bar shown on small screens instead of the header navigation. */
export function MobileNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const items = [
    { href: '/', icon: '🏠', label: t('common.home'), active: pathname === '/' },
    { href: '/games', icon: '🎮', label: t('nav.games'), active: pathname.startsWith('/games') },
    { href: '/collection', icon: '🛂', label: t('nav.collection'), active: pathname === '/collection' },
    { href: '/leaderboard', icon: '🏆', label: t('nav.leaderboard'), active: pathname === '/leaderboard' },
    { href: '/handbook', icon: '📖', label: t('nav.handbook'), active: pathname === '/handbook' },
  ];
  return (
    <nav className="mobile-nav" aria-label="Main">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={i.active ? 'active' : ''}>
          <span aria-hidden>{i.icon}</span>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
