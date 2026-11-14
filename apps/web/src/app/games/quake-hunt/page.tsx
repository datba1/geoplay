import { Suspense } from 'react';
import type { Metadata } from 'next';
import { QuakeHuntPage } from '@/games/QuakeHunt';

export const metadata: Metadata = { title: 'Quake Hunt' };

export default function Page() {
  return (
    <Suspense>
      <QuakeHuntPage />
    </Suspense>
  );
}
