import { HomeHero } from '@/components/HomeHero';
import { DailyChallenge } from '@/components/DailyChallenge';
import { FactCard } from '@/components/FactCard';
import { ExploreTiles } from '@/components/ExploreTiles';

/** Home is a hub: hero, today's challenge, card of the day, and entry tiles. */
export default function HomePage() {
  return (
    <div className="container">
      <HomeHero />
      <section className="section" id="daily">
        <DailyChallenge />
      </section>
      <section className="section">
        <FactCard />
      </section>
      <ExploreTiles />
    </div>
  );
}
