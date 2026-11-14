import type { World } from './geo';

export interface Region {
  id: string;
  /** [west, south, east, north] in degrees, used to fit the map. */
  bbox: [number, number, number, number];
  codes: string[];
}

export const REGIONS: Record<'europe' | 'africa' | 'asia', Region> = {
  europe: {
    id: 'europe',
    bbox: [-11, 35, 33, 70],
    codes: ['PT', 'ES', 'FR', 'BE', 'NL', 'LU', 'DE', 'CH', 'AT', 'IT', 'SI', 'HR', 'BA', 'RS', 'ME', 'AL', 'MK', 'GR',
      'BG', 'RO', 'MD', 'UA', 'BY', 'LT', 'LV', 'EE', 'PL', 'CZ', 'SK', 'HU', 'DK', 'NO', 'SE', 'FI', 'GB', 'IE'],
  },
  africa: {
    id: 'africa',
    bbox: [-18, -35, 52, 37],
    codes: ['MA', 'DZ', 'TN', 'LY', 'EG', 'EH', 'MR', 'ML', 'NE', 'TD', 'SD', 'SS', 'ER', 'DJ', 'ET', 'SO', 'KE', 'UG',
      'RW', 'BI', 'TZ', 'CD', 'CG', 'GA', 'GQ', 'CM', 'CF', 'NG', 'BJ', 'TG', 'GH', 'CI', 'LR', 'SL', 'GN', 'GW', 'SN',
      'GM', 'BF', 'AO', 'ZM', 'MW', 'MZ', 'ZW', 'BW', 'NA', 'ZA', 'LS', 'SZ', 'MG'],
  },
  asia: {
    id: 'asia',
    bbox: [44, -10, 146, 55],
    codes: ['CN', 'MN', 'KZ', 'KG', 'TJ', 'UZ', 'TM', 'AF', 'PK', 'IR', 'IN', 'NP', 'BT', 'BD', 'LK', 'MM', 'TH', 'LA',
      'KH', 'VN', 'MY', 'ID', 'PH', 'TW', 'KR', 'KP', 'JP'],
  },
};

/** Neighbour lists restricted to one region (only countries present on the map). */
export function regionGraph(world: World, region: Region) {
  const set = new Set(region.codes.filter((c) => world.byA2.has(c)));
  const graph = new Map<string, string[]>();
  for (const c of set) graph.set(c, [...(world.neighbors.get(c) ?? [])].filter((n) => set.has(n)));
  // Drop isolated countries (no neighbour inside the region).
  for (const [c, n] of graph) if (!n.length) graph.delete(c);
  for (const [c, n] of graph) graph.set(c, n.filter((x) => graph.has(x)));
  return graph;
}

/** Breadth-first distances from one country over a graph. */
export function bfs(graph: Map<string, string[]>, start: string) {
  const dist = new Map<string, number>([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const c = queue.shift()!;
    for (const n of graph.get(c) ?? []) if (!dist.has(n)) { dist.set(n, dist.get(c)! + 1); queue.push(n); }
  }
  return dist;
}
