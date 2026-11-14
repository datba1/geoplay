'use client';

import type { ReactNode } from 'react';
import { I18nProvider } from '@/lib/i18n';
import { ProgressProvider } from '@/lib/progress';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ProgressProvider>{children}</ProgressProvider>
    </I18nProvider>
  );
}
