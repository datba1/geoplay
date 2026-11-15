/** Small two-tone navigation icons (24×24), coloured per section. */
const ICONS: Record<string, { color: string; d: string; fill?: string }> = {
  home: { color: '#fdba74', d: 'M4 11 L12 4 L20 11 M6 10 V20 H18 V10', fill: 'M10 20 V14 H14 V20 Z' },
  games: { color: '#fb923c', d: 'M7 8 H17 C20 8 21 11 21 14 C21 17 19 18 17.5 17 L15 14.5 H9 L6.5 17 C5 18 3 17 3 14 C3 11 4 8 7 8 Z M8 10.5 V13.5 M6.5 12 H9.5', fill: 'M15.5 11 A1 1 0 1 0 15.5 11.01 Z M17.5 13 A1 1 0 1 0 17.5 13.01 Z' },
  collection: { color: '#a78bfa', d: 'M9 3 H15 L13.5 8.5 H10.5 Z M12 21 A6 6 0 1 0 12 9 A6 6 0 1 0 12 21 Z', fill: 'M12 12.2 L13 14.3 L15.2 14.6 L13.6 16.1 L14 18.3 L12 17.2 L10 18.3 L10.4 16.1 L8.8 14.6 L11 14.3 Z' },
  leaderboard: { color: '#facc15', d: 'M7 4 H17 V9 A5 5 0 0 1 7 9 Z M7 6 H4 C4 9 5 11 7.5 11 M17 6 H20 C20 9 19 11 16.5 11 M12 14 V18 M8 20 H16' },
  handbook: { color: '#5eead4', d: 'M4 5 C7 4 10 4.5 12 6 C14 4.5 17 4 20 5 V19 C17 18 14 18.5 12 20 C10 18.5 7 18 4 19 Z M12 6 V20' },
  facts: { color: '#fde047', d: 'M9 17 H15 M10 20 H14 M12 3 A6 6 0 0 1 15.5 13.8 C14.6 14.5 14.5 15.2 14.5 16 H9.5 C9.5 15.2 9.4 14.5 8.5 13.8 A6 6 0 0 1 12 3 Z', fill: 'M12 6.5 L10.5 10 H13.5 L12 13.5' },
};

export function NavIcon({ name, size = 16 }: { name: string; size?: number }) {
  const i = ICONS[name] ?? ICONS.games;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="nav-icon" style={{ color: i.color }}>
      <path d={i.d} fill="color-mix(in srgb, currentColor 18%, transparent)" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      {i.fill && <path d={i.fill} fill="currentColor" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />}
    </svg>
  );
}
