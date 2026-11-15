export type GameCategory = 'maps' | 'flags' | 'data' | 'strategy' | 'nature';

export interface GameInfo {
  slug: string;
  category: GameCategory;
  kind: string;
  /** Upper bound for a single submitted score (basic anti-cheat). */
  maxPoints: number;
  implemented: boolean;
}

export const GAMES: GameInfo[] = [
  { slug: 'true-size', category: 'maps', kind: 'packing', maxPoints: 1000, implemented: true },
  { slug: 'border-sketch', category: 'maps', kind: 'memory', maxPoints: 5000, implemented: true },
  { slug: 'warped-map', category: 'maps', kind: 'quiz', maxPoints: 1200, implemented: true },
  { slug: 'globe-cut', category: 'maps', kind: 'puzzle', maxPoints: 900, implemented: true },
  { slug: 'shadow-hunt', category: 'maps', kind: 'spatial', maxPoints: 1200, implemented: true },
  { slug: 'sunset-chase', category: 'maps', kind: 'action', maxPoints: 600, implemented: true },
  { slug: 'quake-hunt', category: 'maps', kind: 'deduction', maxPoints: 1000, implemented: true },
  { slug: 'nation-scales', category: 'maps', kind: 'estimation', maxPoints: 1000, implemented: true },
  { slug: 'flag-fault', category: 'flags', kind: 'sharp-eyes', maxPoints: 2000, implemented: true },
  { slug: 'flag-painter', category: 'flags', kind: 'flags', maxPoints: 1000, implemented: true },
  { slug: 'flag-mashup', category: 'flags', kind: 'flags', maxPoints: 1000, implemented: true },
  { slug: 'border-chess', category: 'strategy', kind: 'strategy', maxPoints: 1000, implemented: true },
  { slug: 'border-go', category: 'strategy', kind: 'strategy', maxPoints: 1000, implemented: true },
  { slug: 'diplomacy', category: 'strategy', kind: 'strategy', maxPoints: 1000, implemented: true },
  { slug: 'new-world', category: 'strategy', kind: 'strategy', maxPoints: 1000, implemented: true },
  { slug: 'elements', category: 'nature', kind: 'discovery', maxPoints: 1000, implemented: true },
  { slug: 'capital-pin', category: 'maps', kind: 'capitals', maxPoints: 1000, implemented: true },
  { slug: 'silhouette', category: 'maps', kind: 'shapes', maxPoints: 1000, implemented: true },
  { slug: 'higher-lower', category: 'data', kind: 'data', maxPoints: 1000, implemented: true },
  { slug: 'north-south', category: 'data', kind: 'capitals', maxPoints: 1000, implemented: true },
  { slug: 'founders', category: 'strategy', kind: 'kingdom', maxPoints: 1000, implemented: true },
];

export const findGame = (slug: string) => GAMES.find((g) => g.slug === slug);
