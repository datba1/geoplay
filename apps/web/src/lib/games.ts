export type GameCategory = 'maps' | 'flags' | 'data' | 'strategy' | 'nature';

export interface GameMeta {
  slug: string;
  no: string;
  category: GameCategory;
  icon: string;
  /** Accent colour used for the card glow, tag and art. */
  accent: string;
  difficulty: 1 | 2 | 3;
  minutes: number;
  maxPoints: number;
  implemented: boolean;
  /** Needs World Bank data from /api/stats */
  needsStats?: boolean;
}

export const GAMES: GameMeta[] = [
  { slug: 'true-size', no: '01', category: 'maps', icon: '🧩', accent: '#f5c66b', difficulty: 1, minutes: 5, maxPoints: 1000, implemented: true },
  { slug: 'border-sketch', no: '02', category: 'maps', icon: '✏️', accent: '#c58cff', difficulty: 2, minutes: 4, maxPoints: 5000, implemented: true },
  { slug: 'warped-map', no: '04', category: 'maps', icon: '🌐', accent: '#ff7a59', difficulty: 2, minutes: 4, maxPoints: 1200, implemented: true, needsStats: true },
  { slug: 'globe-cut', no: '05', category: 'maps', icon: '🔪', accent: '#7cc4ff', difficulty: 3, minutes: 5, maxPoints: 900, implemented: true },
  { slug: 'shadow-hunt', no: '07', category: 'maps', icon: '🌑', accent: '#a5b4fc', difficulty: 2, minutes: 3, maxPoints: 1200, implemented: true },
  { slug: 'sunset-chase', no: '08', category: 'maps', icon: '🌇', accent: '#ffb26b', difficulty: 2, minutes: 2, maxPoints: 600, implemented: true },
  { slug: 'quake-hunt', no: '09', category: 'maps', icon: '📡', accent: '#f87171', difficulty: 3, minutes: 4, maxPoints: 1000, implemented: true },
  { slug: 'nation-scales', no: '10', category: 'maps', icon: '⚖️', accent: '#fbbf24', difficulty: 2, minutes: 4, maxPoints: 1000, implemented: true },
  { slug: 'capital-pin', no: '17', category: 'maps', icon: '📍', accent: '#fbbf24', difficulty: 2, minutes: 3, maxPoints: 1000, implemented: true },
  { slug: 'silhouette', no: '18', category: 'maps', icon: '🗺️', accent: '#e9e2cf', difficulty: 1, minutes: 3, maxPoints: 1000, implemented: true },
  { slug: 'flag-fault', no: '03', category: 'flags', icon: '🔍', accent: '#5eead4', difficulty: 2, minutes: 3, maxPoints: 2000, implemented: true },
  { slug: 'flag-painter', no: '06', category: 'flags', icon: '🎨', accent: '#ff8fb1', difficulty: 2, minutes: 4, maxPoints: 1000, implemented: true },
  { slug: 'flag-mashup', no: '11', category: 'flags', icon: '🧵', accent: '#93c5fd', difficulty: 2, minutes: 3, maxPoints: 1000, implemented: true },
  { slug: 'higher-lower', no: '19', category: 'data', icon: '📊', accent: '#60a5fa', difficulty: 1, minutes: 3, maxPoints: 1000, implemented: true, needsStats: true },
  { slug: 'north-south', no: '20', category: 'data', icon: '🧭', accent: '#4fd1a1', difficulty: 2, minutes: 3, maxPoints: 1000, implemented: true },
  { slug: 'founders', no: '21', category: 'strategy', icon: '🏰', accent: '#e0b84a', difficulty: 3, minutes: 12, maxPoints: 1000, implemented: true },
  { slug: 'border-chess', no: '12', category: 'strategy', icon: '♞', accent: '#f5c66b', difficulty: 3, minutes: 8, maxPoints: 1000, implemented: true },
  { slug: 'border-go', no: '13', category: 'strategy', icon: '⚫', accent: '#e2e8f0', difficulty: 3, minutes: 8, maxPoints: 1000, implemented: true },
  { slug: 'diplomacy', no: '14', category: 'strategy', icon: '🃏', accent: '#86efac', difficulty: 2, minutes: 6, maxPoints: 1000, implemented: true },
  { slug: 'new-world', no: '15', category: 'strategy', icon: '🏰', accent: '#c4b5fd', difficulty: 2, minutes: 6, maxPoints: 1000, implemented: true },
  { slug: 'elements', no: '16', category: 'nature', icon: '🔥', accent: '#fb923c', difficulty: 1, minutes: 6, maxPoints: 1000, implemented: true },
];

export const gameMeta = (slug: string) => GAMES.find((g) => g.slug === slug);
export const gameName = (slug: string) => `game.${slug}.name`;
