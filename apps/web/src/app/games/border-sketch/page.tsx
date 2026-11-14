import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BorderSketchPage } from '@/games/BorderSketch';

export const metadata: Metadata = { title: 'Border Sketch' };

export default function Page() {
  return (
    <Suspense>
      <BorderSketchPage />
    </Suspense>
  );
}
