import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ShadowHuntPage } from '@/games/ShadowHunt';

export const metadata: Metadata = { title: 'Shadow Hunt' };

export default function Page() {
  return (
    <Suspense>
      <ShadowHuntPage />
    </Suspense>
  );
}
