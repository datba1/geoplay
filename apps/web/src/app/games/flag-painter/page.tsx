import { Suspense } from 'react';
import type { Metadata } from 'next';
import { FlagPainterPage } from '@/games/FlagPainter';

export const metadata: Metadata = { title: 'Flag Painter' };

export default function Page() {
  return (
    <Suspense>
      <FlagPainterPage />
    </Suspense>
  );
}
