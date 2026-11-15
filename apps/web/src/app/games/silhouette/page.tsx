import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SilhouettePage } from '@/games/Silhouette';

export const metadata: Metadata = { title: 'Silhouette' };

export default function Page() {
  return (
    <Suspense>
      <SilhouettePage />
    </Suspense>
  );
}
