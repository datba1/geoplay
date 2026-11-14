import { Suspense } from 'react';
import type { Metadata } from 'next';
import { TrueSizePage } from '@/games/TrueSize';

export const metadata: Metadata = { title: 'True Size' };

export default function Page() {
  return (
    <Suspense>
      <TrueSizePage />
    </Suspense>
  );
}
