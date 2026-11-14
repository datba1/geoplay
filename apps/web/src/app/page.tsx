import { HomeHero } from '@/components/HomeHero';
import { DailyChallenge } from '@/components/DailyChallenge';
import { FactCard } from '@/components/FactCard';
import { HandbookCard } from '@/components/HandbookCard';
import { CollectionSummary } from '@/components/CollectionSummary';
import { GameGrid } from '@/components/GameGrid';

export default function HomePage() {
  return (
    <div className="container">
      <HomeHero />
      <section className="section" id="daily">
        <DailyChallenge />
      </section>
      <section className="discover">
        <FactCard />
        <HandbookCard />
      </section>
      <CollectionSummary />
      <GameGrid />
    </div>
  );
}
