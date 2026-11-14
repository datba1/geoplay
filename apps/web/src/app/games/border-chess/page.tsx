import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BorderChessPage } from '@/games/BorderChess';

export const metadata: Metadata = { title: 'Border Chess' };

export default function Page() {
  return (
    <Suspense>
      <BorderChessPage />
    </Suspense>
  );
}
