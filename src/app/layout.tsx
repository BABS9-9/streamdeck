export const metadata = {
  title: 'StreamDeck',
  description: 'Premium IPTV Player',
  manifest: '/manifest.json',
  themeColor: '#6d5dfc',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
