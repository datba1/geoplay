import { RankCoin } from './Medal';

/** Tier coin with the level struck in the middle (header chip + collection). */
export function RankMedal({ tier, level, size = 30 }: { tier: 'bronze' | 'silver' | 'gold' | 'platinum'; level: number; size?: number }) {
  return (
    <span className="rank-medal" style={{ width: size, height: size }}>
      <RankCoin tier={tier} level={level} size={size} />
    </span>
  );
}
