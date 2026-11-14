import { Suspense } from 'react';
import type { Metadata } from 'next';
import { FlagMashupPage } from '@/games/FlagMashup';

export const metadata: Metadata = { title: 'Flag Mashup' };

export default function Page() {
  return (
    <Suspense>
      <FlagMashupPage />
    </Suspense>
  );
}
