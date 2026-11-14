import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BorderGoPage } from '@/games/BorderGo';

export const metadata: Metadata = { title: 'Border Go' };

export default function Page() {
  return (
    <Suspense>
      <BorderGoPage />
    </Suspense>
  );
}
