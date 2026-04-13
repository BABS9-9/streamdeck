'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  ['/', 'Login'],
  ['/home', 'Home'],
  ['/live', 'Live TV'],
  ['/movies', 'Movies'],
  ['/series', 'Series'],
  ['/settings', 'Settings'],
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-black/30 p-6 lg:flex lg:flex-col">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-violet-300">BABcorp</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">StreamDeck</h1>
        <p className="mt-2 text-sm text-slate-400">IPTV, without the jank.</p>
      </div>
      <nav className="mt-10 space-y-2">
        {nav.map(([href, label]) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center rounded-2xl px-4 py-3 text-sm transition ${active ? 'bg-violet-500/20 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
