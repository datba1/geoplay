import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { NicknameModal } from '@/components/NicknameModal';
import { MobileNav } from '@/components/MobileNav';

export const metadata: Metadata = {
  title: { default: 'GeoPlay', template: '%s · GeoPlay' },
  description: 'Geography games about maps, flags and true sizes. See the world from a new angle.',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#070b14',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=EB+Garamond:ital,wght@0,500;0,700;1,500&family=Fraunces:ital,opsz,wght@0,9..144,400..600;1,9..144,400..600&display=swap"
        />
      </head>
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
          <NicknameModal />
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}
