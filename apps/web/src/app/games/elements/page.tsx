import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ElementsPage } from '@/games/Elements';

export const metadata: Metadata = { title: 'Elements' };

export default function Page() {
  return (
    <Suspense>
      <ElementsPage />
    </Suspense>
  );
}
