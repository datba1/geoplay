import { Suspense } from 'react';
import type { Metadata } from 'next';
import { FoundersPage } from '@/games/Founders';

export const metadata: Metadata = { title: 'Founders' };

export default function Page() {
  return (
    <Suspense>
      <FoundersPage />
    </Suspense>
  );
}
