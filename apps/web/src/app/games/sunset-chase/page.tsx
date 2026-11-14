import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SunsetChasePage } from '@/games/SunsetChase';

export const metadata: Metadata = { title: 'Sunset Chase' };

export default function Page() {
  return (
    <Suspense>
      <SunsetChasePage />
    </Suspense>
  );
}
