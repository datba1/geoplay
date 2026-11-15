import { Suspense } from 'react';
import type { Metadata } from 'next';
import { HigherLowerPage } from '@/games/HigherLower';

export const metadata: Metadata = { title: 'Higher or Lower' };

export default function Page() {
  return (
    <Suspense>
      <HigherLowerPage />
    </Suspense>
  );
}
