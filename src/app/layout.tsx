import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'StreamDeck',
  description: 'Premium IPTV Player',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#6d5dfc',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
