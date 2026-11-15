/** Rosette medal in the tier's colour with the level in the middle (header chip + collection). */
export function RankMedal({ tier, level, size = 30 }: { tier: string; level: number; size?: number }) {
  return (
    <span className={`rank-medal ${tier}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <path d="M50 4 61 15 76 12 80 27 94 34 88 48 94 62 80 69 76 84 61 81 50 92 39 81 24 84 20 69 6 62 12 48 6 34 20 27 24 12 39 15Z" className="rim" />
        <circle cx="50" cy="48" r="30" className="face" />
      </svg>
      <span className="lvl" style={{ fontSize: size * 0.32 }}>{level}</span>
    </span>
  );
}
