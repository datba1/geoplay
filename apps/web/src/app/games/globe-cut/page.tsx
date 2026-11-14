import { Suspense } from 'react';
import type { Metadata } from 'next';
import { GlobeCutPage } from '@/games/GlobeCut';

export const metadata: Metadata = { title: 'Globe Cut' };

export default function Page() {
  return (
    <Suspense>
      <GlobeCutPage />
    </Suspense>
  );
}
