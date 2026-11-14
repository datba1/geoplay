import { Suspense } from 'react';
import type { Metadata } from 'next';
import { NationScalesPage } from '@/games/NationScales';

export const metadata: Metadata = { title: 'Nation Scales' };

export default function Page() {
  return (
    <Suspense>
      <NationScalesPage />
    </Suspense>
  );
}
