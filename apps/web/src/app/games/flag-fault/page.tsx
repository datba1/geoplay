import { Suspense } from 'react';
import type { Metadata } from 'next';
import { FlagFaultPage } from '@/games/FlagFault';

export const metadata: Metadata = { title: 'Flag Fault' };

export default function Page() {
  return (
    <Suspense>
      <FlagFaultPage />
    </Suspense>
  );
}
