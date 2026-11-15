/**
 * Cache-Control values. `s-maxage` lets Vercel's CDN serve the response from the edge
 * location nearest the visitor without running the function; `stale-while-revalidate`
 * keeps serving the old copy while a fresh one is fetched in the background.
 */
export const CACHE = {
  /** Static catalogue */
  long: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  /** Changes at most daily */
  medium: 'public, max-age=60, s-maxage=600, stale-while-revalidate=3600',
  /** Live-ish data such as the leaderboard */
  short: 'public, max-age=0, s-maxage=10, stale-while-revalidate=30',
  none: 'no-store',
};
