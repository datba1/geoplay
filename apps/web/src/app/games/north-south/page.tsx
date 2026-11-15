import { Suspense } from 'react';
import type { Metadata } from 'next';
import { NorthSouthPage } from '@/games/NorthSouth';

export const metadata: Metadata = { title: 'Compass Duel' };

export default function Page() {
  return (
    <Suspense>
      <NorthSouthPage />
    </Suspense>
  );
}
