import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CapitalPinPage } from '@/games/CapitalPin';

export const metadata: Metadata = { title: 'Capital Pin' };

export default function Page() {
  return (
    <Suspense>
      <CapitalPinPage />
    </Suspense>
  );
}
