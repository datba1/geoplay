import { Suspense } from 'react';
import type { Metadata } from 'next';
import { DiplomacyPage } from '@/games/Diplomacy';

export const metadata: Metadata = { title: 'Diplomacy Duel' };

export default function Page() {
  return (
    <Suspense>
      <DiplomacyPage />
    </Suspense>
  );
}
