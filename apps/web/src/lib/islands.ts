/**
 * Island groups too small for the 1:110m map data, drawn as an extra layer.
 * Coordinates are approximate positions of the main islands and reefs ([lon, lat]).
 */
export interface Archipelago {
  id: 'paracel' | 'spratly';
  /** Country the group is drawn as part of. */
  owner: string;
  name: { en: string; vi: string };
  /** Where the label is anchored. */
  label: [number, number];
  points: [number, number][];
}

export const ARCHIPELAGOS: Archipelago[] = [
  {
    id: 'paracel',
    owner: 'VN',
    name: { en: 'Paracel Islands (Vietnam)', vi: 'Quần đảo Hoàng Sa (Việt Nam)' },
    label: [112.0, 16.5],
    points: [
      [112.34, 16.83], [112.73, 16.67], [111.61, 16.53], [111.71, 16.45], [111.2, 15.78],
      [112.21, 16.96], [111.74, 16.58], [111.53, 16.45], [112.6, 16.0],
    ],
  },
  {
    id: 'spratly',
    owner: 'VN',
    name: { en: 'Spratly Islands (Vietnam)', vi: 'Quần đảo Trường Sa (Việt Nam)' },
    label: [113.6, 9.6],
    points: [
      [111.92, 8.64], [114.36, 10.38], [114.28, 11.05], [114.33, 11.43], [114.36, 10.18],
      [114.33, 9.88], [112.92, 7.87], [113.84, 7.38], [115.0, 10.7], [114.65, 8.85],
      [113.2, 9.0], [115.5, 8.9],
    ],
  },
];

export const islandName = (a: Archipelago, lang: string) => (lang === 'vi' ? a.name.vi : a.name.en);
