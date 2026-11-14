import { Suspense } from 'react';
import type { Metadata } from 'next';
import { WarpedMapPage } from '@/games/WarpedMap';

export const metadata: Metadata = { title: 'Warped Map' };

export default function Page() {
  return (
    <Suspense>
      <WarpedMapPage />
    </Suspense>
  );
}
