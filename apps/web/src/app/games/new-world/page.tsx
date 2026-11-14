import { Suspense } from 'react';
import type { Metadata } from 'next';
import { NewWorldPage } from '@/games/NewWorld';

export const metadata: Metadata = { title: 'New World' };

export default function Page() {
  return (
    <Suspense>
      <NewWorldPage />
    </Suspense>
  );
}
